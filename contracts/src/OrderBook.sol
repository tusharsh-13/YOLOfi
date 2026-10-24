// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IOrderBook.sol";

/// @title OrderBook
/// @notice Fully onchain central limit order book (CLOB) for a single ERC-20 pair.
/// Users deposit tokens and trade against internal balances. Matching and settlement
/// are atomic storage mutations. Only deposit/withdraw touch external ERC-20s.
contract OrderBook is IOrderBook, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 private constant PRICE_SCALE = 1e18;
    uint256 private constant MAX_FILLS_CAP = 20;
    uint256 private constant MAX_FEE_BPS = 100;

    // ============ State ============
    address public immutable base;
    address public immutable quote;
    uint256 public immutable tickSize;
    uint256 public immutable lotSize;
    uint256 public immutable minOrderSize;

    uint256 public takerFeeBps;
    uint256 public feeBalance;
    address public immutable owner;

    uint64 public orderCount;
    uint256 public bestBid;
    uint256 public bestAsk;

    // Per-user balances: free (available) + locked (in open orders)
    mapping(address => UserBalances) public balances;

    // Order storage: id -> Order
    mapping(uint64 => Order) public orders;

    // Price level storage: side -> price -> PriceLevel
    mapping(Side => mapping(uint256 => PriceLevel)) public priceLevels;

    // Active price levels per side (sorted linked list via price)
    mapping(Side => mapping(uint256 => uint256)) public levelPrev; // price -> prevPrice
    mapping(Side => mapping(uint256 => uint256)) public levelNext; // price -> nextPrice

    // User's open order list (head of linked list per user)
    mapping(address => uint64) public userOrderHead;

    // ============ Constructor ============
    /// @param base_ Base token (e.g., tYBTC)
    /// @param quote_ Quote token (e.g., tUSDC)
    /// @param tickSize_ Quote units per 1e18 base (must divide evenly with lotSize)
    /// @param lotSize_ Base smallest units (min order increment)
    /// @param minOrderSize_ Minimum order size in base units
    /// @param takerFeeBps_ Taker fee in basis points (default 10 = 0.10%, max 100)
    constructor(
        address base_,
        address quote_,
        uint256 tickSize_,
        uint256 lotSize_,
        uint256 minOrderSize_,
        uint256 takerFeeBps_
    ) {
        if (base_ == address(0) || quote_ == address(0)) {
            revert IOrderBook.InvalidToken(address(0));
        }
        if (base_ == quote_) revert IOrderBook.InvalidToken(quote_);
        if (tickSize_ == 0 || lotSize_ == 0) revert IOrderBook.InvalidToken(address(0));
        if ((tickSize_ * lotSize_) % PRICE_SCALE != 0) revert IOrderBook.InvalidToken(address(0));
        if (takerFeeBps_ > MAX_FEE_BPS) revert IOrderBook.ExceedsFeeLimit(takerFeeBps_);

        base = base_;
        quote = quote_;
        tickSize = tickSize_;
        lotSize = lotSize_;
        minOrderSize = minOrderSize_;
        takerFeeBps = takerFeeBps_;
        owner = msg.sender;
    }

    // ============ Deposit / Withdraw ============
    /// @notice Deposit tokens into the order book (increases free balance)
    /// @param token Must be base or quote
    /// @param amount Amount in token's smallest units
    function deposit(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert IOrderBook.ZeroAmount();
        if (token != base && token != quote) revert IOrderBook.InvalidToken(token);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        if (token == base) {
            balances[msg.sender].baseFree += amount;
        } else {
            balances[msg.sender].quoteFree += amount;
        }

        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw free tokens from the order book
    /// @param token Must be base or quote
    /// @param amount Amount in token's smallest units
    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert IOrderBook.ZeroAmount();
        if (token != base && token != quote) revert IOrderBook.InvalidToken(token);

        UserBalances storage b = balances[msg.sender];
        uint256 free = (token == base) ? b.baseFree : b.quoteFree;
        if (free < amount) revert IOrderBook.InsufficientBalance(free, amount);

        if (token == base) {
            b.baseFree -= amount;
        } else {
            b.quoteFree -= amount;
        }

        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    // ============ Internal Helpers: Price Level Management ============
    /// @notice Check if a price level exists (has orders)
    function _levelExists(Side side, uint256 price) internal view returns (bool) {
        return priceLevels[side][price].totalRemaining > 0;
    }

    /// @notice Insert a new price level into the sorted linked list for a side
    /// @param side BUY or SELL
    /// @param price The price to insert
    /// @param hintPrice Optional hint: existing level near insertion point (0 = start from best)
    function _insertPriceLevel(Side side, uint256 price, uint256 hintPrice) internal {
        // Level already exists
        if (_levelExists(side, price)) return;

        uint256 current;
        if (hintPrice != 0 && _levelExists(side, hintPrice)) {
            current = hintPrice;
        } else {
            current = (side == Side.BUY) ? bestBid : bestAsk;
        }

        if (current == 0) {
            // First level on this side
            if (side == Side.BUY) bestBid = price;
            else bestAsk = price;
            return;
        }

        // Traverse to find insertion point
        // BUY: higher price = better (closer to bestBid), descending order
        // SELL: lower price = better (closer to bestAsk), ascending order
        if (side == Side.BUY) {
            // Find first level with price <= new price (or end of list)
            while (current != 0 && current > price) {
                uint256 nextP = levelNext[side][current];
                if (nextP == 0 || nextP <= price) break;
                current = nextP;
            }
        } else {
            // Find first level with price >= new price (or end of list)
            while (current != 0 && current < price) {
                uint256 nextP = levelNext[side][current];
                if (nextP == 0 || nextP >= price) break;
                current = nextP;
            }
        }

        uint256 prevPrice = levelPrev[side][current];
        uint256 nextPrice = levelNext[side][current];

        // Determine if we insert before or after current
        bool insertBefore;
        if (side == Side.BUY) {
            insertBefore = (current <= price);
        } else {
            insertBefore = (current >= price);
        }

        if (insertBefore) {
            // Insert before current
            levelPrev[side][price] = prevPrice;
            levelNext[side][price] = current;
            levelPrev[side][current] = price;
            if (prevPrice != 0) {
                levelNext[side][prevPrice] = price;
            } else {
                // New best price
                if (side == Side.BUY) bestBid = price;
                else bestAsk = price;
            }
        } else {
            // Insert after current
            levelPrev[side][price] = current;
            levelNext[side][price] = nextPrice;
            levelNext[side][current] = price;
            if (nextPrice != 0) {
                levelPrev[side][nextPrice] = price;
            }
        }
    }

    /// @notice Remove a price level from the sorted linked list if empty
    function _removePriceLevelIfEmpty(Side side, uint256 price) internal {
        if (_levelExists(side, price)) return;

        uint256 prevPrice = levelPrev[side][price];
        uint256 nextPrice = levelNext[side][price];

        if (prevPrice != 0) {
            levelNext[side][prevPrice] = nextPrice;
        } else {
            // Was best price
            if (side == Side.BUY) bestBid = nextPrice;
            else bestAsk = nextPrice;
        }

        if (nextPrice != 0) {
            levelPrev[side][nextPrice] = prevPrice;
        }

        // Clean up mappings
        delete levelPrev[side][price];
        delete levelNext[side][price];
    }

    /// @notice Add order to the tail of a price level's FIFO queue
    function _addOrderToLevel(Side side, uint256 price, uint64 orderId) internal {
        PriceLevel storage level = priceLevels[side][price];

        if (level.head == 0) {
            // First order at this level
            level.head = orderId;
            level.tail = orderId;
        } else {
            // Append to tail
            orders[level.tail].next = orderId;
            orders[orderId].prev = level.tail;
            level.tail = orderId;
        }
        level.totalRemaining += orders[orderId].amount - orders[orderId].filled;
    }

    /// @notice Remove order from a price level's FIFO queue
    function _removeOrderFromLevel(Side side, uint256 price, uint64 orderId) internal {
        PriceLevel storage level = priceLevels[side][price];
        Order storage order = orders[orderId];

        uint256 remaining = order.amount - order.filled;
        if (level.totalRemaining >= remaining) {
            level.totalRemaining -= remaining;
        }

        // Unlink from FIFO
        if (order.prev != 0) {
            orders[order.prev].next = order.next;
        } else {
            // Was head
            level.head = order.next;
        }

        if (order.next != 0) {
            orders[order.next].prev = order.prev;
        } else {
            // Was tail
            level.tail = order.prev;
        }

        // Clear order's level pointers
        order.prev = 0;
        order.next = 0;
    }

    /// @notice Add order to user's open order list
    function _addOrderToUser(address user, uint64 orderId) internal {
        uint64 head = userOrderHead[user];
        if (head != 0) {
            orders[orderId].userNext = head;
            orders[head].userPrev = orderId;
        }
        userOrderHead[user] = orderId;
    }

    /// @notice Remove order from user's open order list
    function _removeOrderFromUser(address user, uint64 orderId) internal {
        Order storage order = orders[orderId];

        if (order.userPrev != 0) {
            orders[order.userPrev].userNext = order.userNext;
        } else {
            // Was head
            userOrderHead[user] = order.userNext;
        }

        if (order.userNext != 0) {
            orders[order.userNext].userPrev = order.userPrev;
        }

        order.userPrev = 0;
        order.userNext = 0;
    }

    // ============ Order Placement ============
    /// @notice Place a limit order (rests in book, no matching in Phase 2)
    /// @param side BUY or SELL
    /// @param price Quote units per 1e18 base (must be multiple of tickSize)
    /// @param amount Base units (must be multiple of lotSize, >= minOrderSize)
    /// @param maxFills Max fills per transaction (for future matching)
    /// @param hintPrice Optional hint for price level insertion (0 = start from best)
    /// @return orderId The created order ID
    function placeLimitOrder(Side side, uint256 price, uint256 amount, uint256 maxFills, uint256 hintPrice)
        external
        override
        returns (uint64 orderId)
    {
        // Validation
        if (amount == 0) revert IOrderBook.ZeroAmount();
        if (amount < minOrderSize) revert IOrderBook.BelowMinOrderSize(amount, minOrderSize);
        if (amount % lotSize != 0) revert IOrderBook.InvalidLotSize(amount, lotSize);
        if (price % tickSize != 0) revert IOrderBook.InvalidTickSize(price, tickSize);
        if (maxFills == 0 || maxFills > MAX_FILLS_CAP) revert IOrderBook.InvalidMaxFills(maxFills);

        // Lock funds
        UserBalances storage b = balances[msg.sender];
        if (side == Side.BUY) {
            // Buy: lock quote (notional + max fee)
            // quoteAmount = amount * price / 1e18
            uint256 quoteAmount = (amount * price) / PRICE_SCALE;
            // Max fee = quoteAmount * takerFeeBps / 10000
            uint256 maxFee = (quoteAmount * takerFeeBps) / 10000;
            uint256 totalLocked = quoteAmount + maxFee;
            if (b.quoteFree < totalLocked) revert IOrderBook.InsufficientBalance(b.quoteFree, totalLocked);
            b.quoteFree -= totalLocked;
            b.quoteLocked += totalLocked;
        } else {
            // Sell: lock base
            if (b.baseFree < amount) revert IOrderBook.InsufficientBalance(b.baseFree, amount);
            b.baseFree -= amount;
            b.baseLocked += amount;
        }

        // Create order
        orderCount++;
        orderId = orderCount;
        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            side: side,
            price: price,
            amount: amount,
            filled: 0,
            prev: 0,
            next: 0,
            userPrev: 0,
            userNext: 0
        });

        // Insert price level if needed
        _insertPriceLevel(side, price, hintPrice);

        // Add to price level FIFO
        _addOrderToLevel(side, price, orderId);

        // Add to user's order list
        _addOrderToUser(msg.sender, orderId);

        emit OrderPlaced(orderId, msg.sender, side, price, amount);
    }

    // ============ Order Cancellation ============
    /// @notice Cancel an open order (owner only)
    /// @param orderId The order to cancel
    function cancelOrder(uint64 orderId) external override {
        Order storage order = orders[orderId];
        if (order.id == 0) revert IOrderBook.OrderNotFound(orderId);
        if (order.owner != msg.sender) revert IOrderBook.NotOrderOwner(orderId, msg.sender);

        uint256 remaining = order.amount - order.filled;
        if (remaining == 0) {
            // Already fully filled, just clean up
            _removeOrderFromUser(msg.sender, orderId);
            emit OrderCancelled(orderId, msg.sender, 0);
            return;
        }

        // Unlock funds
        UserBalances storage b = balances[msg.sender];
        if (order.side == Side.BUY) {
            // Buy: unlock quote (notional + fee headroom for remaining)
            uint256 quoteAmount = (remaining * order.price) / PRICE_SCALE;
            uint256 maxFee = (quoteAmount * takerFeeBps) / 10000;
            uint256 totalLocked = quoteAmount + maxFee;
            b.quoteLocked -= totalLocked;
            b.quoteFree += totalLocked;
        } else {
            // Sell: unlock base
            b.baseLocked -= remaining;
            b.baseFree += remaining;
        }

        // Remove from price level
        _removeOrderFromLevel(order.side, order.price, orderId);

        // Remove from user's order list
        _removeOrderFromUser(msg.sender, orderId);

        // Remove price level if empty
        _removePriceLevelIfEmpty(order.side, order.price);

        emit OrderCancelled(orderId, msg.sender, remaining);
    }

    // ============ View Functions ============
    function getBalances(address user) external view override returns (UserBalances memory) {
        return balances[user];
    }

    function getOrder(uint64 orderId) external view override returns (Order memory) {
        return orders[orderId];
    }

    function getTopLevels(Side side, uint256 n) external view override returns (TopLevelsResult memory) {
        TopLevelsResult memory result;
        result.prices = new uint256[](n);
        result.totals = new uint256[](n);

        uint256 current = (side == Side.BUY) ? bestBid : bestAsk;
        for (uint256 i = 0; i < n && current > 0; i++) {
            PriceLevel storage level = priceLevels[side][current];
            result.prices[i] = current;
            result.totals[i] = level.totalRemaining;
            current = levelNext[side][current];
        }
        return result;
    }

    function getUserOrders(address user) external view override returns (uint64[] memory) {
        uint64 head = userOrderHead[user];
        uint256 count = 0;
        uint64 current = head;
        while (current != 0) {
            count++;
            current = orders[current].userNext;
        }

        uint64[] memory result = new uint64[](count);
        current = head;
        for (uint256 i = 0; i < count; i++) {
            result[i] = current;
            current = orders[current].userNext;
        }
        return result;
    }

    function getSpread() external view override returns (uint256 bestBid_, uint256 bestAsk_) {
        return (bestBid, bestAsk);
    }

    // ============ Admin Functions ============
    function setFee(uint256 newFeeBps) external override {
        if (msg.sender != owner) revert IOrderBook.NotOrderOwner(0, address(0));
        if (newFeeBps > MAX_FEE_BPS) revert IOrderBook.ExceedsFeeLimit(newFeeBps);
        takerFeeBps = newFeeBps;
    }

    function withdrawFees() external override {
        if (msg.sender != owner) revert IOrderBook.NotOrderOwner(0, address(0));
        if (feeBalance == 0) revert IOrderBook.ZeroAmount();
        uint256 amount = feeBalance;
        feeBalance = 0;
        IERC20(quote).safeTransfer(owner, amount);
        emit FeeCollected(amount);
    }
}
