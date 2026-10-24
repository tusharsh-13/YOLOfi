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
    mapping(address => uint256) public baseFree;
    mapping(address => uint256) public baseLocked;
    mapping(address => uint256) public quoteFree;
    mapping(address => uint256) public quoteLocked;

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
            baseFree[msg.sender] += amount;
        } else {
            quoteFree[msg.sender] += amount;
        }

        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw free tokens from the order book
    /// @param token Must be base or quote
    /// @param amount Amount in token's smallest units
    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert IOrderBook.ZeroAmount();
        if (token != base && token != quote) revert IOrderBook.InvalidToken(token);

        uint256 free = (token == base) ? baseFree[msg.sender] : quoteFree[msg.sender];
        if (free < amount) revert IOrderBook.InsufficientBalance(free, amount);

        if (token == base) {
            baseFree[msg.sender] -= amount;
        } else {
            quoteFree[msg.sender] -= amount;
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

    // ============ Matching Engine ============
    /// @notice Execute a trade between taker (incoming) and maker (resting) order
    /// @param takerOrderId The incoming order ID
    /// @param makerOrderId The resting order ID
    /// @param fillAmount Amount to fill (base units)
    /// @param makerPrice Price of the maker order (trade executes at this price)
    /// @return fee The taker fee charged
    function _executeTrade(uint64 takerOrderId, uint64 makerOrderId, uint256 fillAmount, uint256 makerPrice)
        internal
        returns (uint256 fee)
    {
        Order storage takerOrder = orders[takerOrderId];
        Order storage makerOrder = orders[makerOrderId];

        // Self-trade protection
        if (takerOrder.owner == makerOrder.owner) {
            revert IOrderBook.SelfTrade();
        }

        // Update filled amounts
        takerOrder.filled += fillAmount;
        makerOrder.filled += fillAmount;

        // Update price level totalRemaining
        PriceLevel storage takerLevel = priceLevels[takerOrder.side][takerOrder.price];
        PriceLevel storage makerLevel = priceLevels[makerOrder.side][makerOrder.price];
        if (takerLevel.totalRemaining >= fillAmount) takerLevel.totalRemaining -= fillAmount;
        if (makerLevel.totalRemaining >= fillAmount) makerLevel.totalRemaining -= fillAmount;

        // Settlement: transfer between internal balances
        address taker = takerOrder.owner;
        address maker = makerOrder.owner;

        if (takerOrder.side == Side.BUY) {
            // Taker is BUY, maker is SELL
            // Taker receives base, pays quote at maker's price
            // Maker receives quote, pays base
            uint256 quoteAmount = (fillAmount * makerPrice) / PRICE_SCALE;

            // Calculate taker fee (in quote)
            fee = (quoteAmount * takerFeeBps) / 10000;

            // Taker: receive base, pay quote (notional + fee)
            baseFree[taker] += fillAmount;
            quoteLocked[taker] -= (quoteAmount + fee);

            // Maker: receive quote, pay base
            quoteFree[maker] += quoteAmount;
            baseLocked[maker] -= fillAmount;

            // Accrue fee
            feeBalance += fee;

            // Refund price improvement to taker (buyer)
            // Taker locked at their price (notional + fee headroom), but trade executes at maker's (better) price
            // Full refund = (lockedQuote + lockedFee) - (actualQuote + actualFee)
            uint256 takerPrice = takerOrder.price;
            if (takerPrice > makerPrice) {
                uint256 notionalImprovement = (fillAmount * (takerPrice - makerPrice)) / PRICE_SCALE;
                uint256 feeImprovement = (notionalImprovement * takerFeeBps) / 10000;
                uint256 totalImprovement = notionalImprovement + feeImprovement;
                quoteLocked[taker] -= totalImprovement;
                quoteFree[taker] += totalImprovement;
            }
        } else {
            // Taker is SELL, maker is BUY
            // Taker receives quote, pays base
            // Maker receives base, pays quote at maker's price
            uint256 quoteAmount = (fillAmount * makerPrice) / PRICE_SCALE;

            // Calculate taker fee (in quote)
            fee = (quoteAmount * takerFeeBps) / 10000;

            // Taker: receive quote (notional - fee), pay base
            quoteFree[taker] += (quoteAmount - fee);
            baseLocked[taker] -= fillAmount;

            // Maker: receive base, pay quote
            baseFree[maker] += fillAmount;
            quoteLocked[maker] -= quoteAmount;

            // Accrue fee
            feeBalance += fee;

            // Refund price improvement to taker (seller)
            // Taker locked base at their price, but receives quote at maker's (better) price
            // The improvement is extra quote received: (makerPrice - takerPrice) * fillAmount / 1e18
            // SELL takers don't lock quote, so improvement goes directly to quoteFree
            uint256 takerPrice = takerOrder.price;
            if (takerPrice < makerPrice) {
                uint256 notionalImprovement = (fillAmount * (makerPrice - takerPrice)) / PRICE_SCALE;
                quoteFree[taker] += notionalImprovement;
            }
        }

        emit TradeExecuted(
            makerOrderId, takerOrderId, maker, taker, makerPrice, fillAmount, fee, uint256(block.timestamp)
        );
    }

    /// @notice Match incoming order against resting orders on opposite side
    /// @param orderId The incoming order ID
    /// @param maxFills Maximum number of fills to execute
    /// @return remaining Amount left unfilled
    function _matchOrders(uint64 orderId, uint256 maxFills) internal returns (uint256 remaining) {
        Order storage takerOrder = orders[orderId];
        remaining = takerOrder.amount - takerOrder.filled;
        uint256 fills = 0;

        // Determine opposite side
        Side makerSide = (takerOrder.side == Side.BUY) ? Side.SELL : Side.BUY;

        // Start from best price on maker side
        uint256 currentPrice = (makerSide == Side.BUY) ? bestBid : bestAsk;

        while (remaining > 0 && fills < maxFills && currentPrice != 0) {
            // Check if price crosses
            bool priceCrosses;
            if (takerOrder.side == Side.BUY) {
                // Buy crosses if maker's ask <= taker's bid
                priceCrosses = currentPrice <= takerOrder.price;
            } else {
                // Sell crosses if maker's bid >= taker's ask
                priceCrosses = currentPrice >= takerOrder.price;
            }

            if (!priceCrosses) break;

            PriceLevel storage level = priceLevels[makerSide][currentPrice];
            uint64 makerOrderId = level.head;

            // Walk through orders at this price level (FIFO)
            while (makerOrderId != 0 && remaining > 0 && fills < maxFills) {
                Order storage makerOrder = orders[makerOrderId];
                uint256 makerRemaining = makerOrder.amount - makerOrder.filled;
                uint256 fillAmount = remaining < makerRemaining ? remaining : makerRemaining;

                // Execute trade at maker's price
                _executeTrade(orderId, makerOrderId, fillAmount, currentPrice);

                remaining -= fillAmount;
                fills++;

                // Move to next order at this level
                makerOrderId = makerOrder.next;

                // If maker order fully filled, remove it from level
                if (makerOrder.filled == makerOrder.amount) {
                    _removeOrderFromLevel(makerSide, currentPrice, makerOrder.id);
                    _removeOrderFromUser(makerOrder.owner, makerOrder.id);
                }
            }

            // If level is empty, remove it
            if (!_levelExists(makerSide, currentPrice)) {
                _removePriceLevelIfEmpty(makerSide, currentPrice);
                currentPrice = (makerSide == Side.BUY) ? bestBid : bestAsk;
            } else {
                // Move to next price level
                currentPrice = levelNext[makerSide][currentPrice];
            }
        }

        return remaining;
    }

    // ============ Order Placement ============
    /// @notice Place a limit order (matches against book, rests remainder)
    /// @param side BUY or SELL
    /// @param price Quote units per 1e18 base (must be multiple of tickSize)
    /// @param amount Base units (must be multiple of lotSize, >= minOrderSize)
    /// @param maxFills Max fills per transaction (capped at MAX_FILLS_CAP)
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
        if (side == Side.BUY) {
            // Buy: lock quote (notional + max fee)
            uint256 quoteAmount = (amount * price) / PRICE_SCALE;
            uint256 maxFee = (quoteAmount * takerFeeBps) / 10000;
            uint256 totalLocked = quoteAmount + maxFee;
            if (quoteFree[msg.sender] < totalLocked) {
                revert IOrderBook.InsufficientBalance(quoteFree[msg.sender], totalLocked);
            }
            quoteFree[msg.sender] -= totalLocked;
            quoteLocked[msg.sender] += totalLocked;
        } else {
            // Sell: lock base
            if (baseFree[msg.sender] < amount) revert IOrderBook.InsufficientBalance(baseFree[msg.sender], amount);
            baseFree[msg.sender] -= amount;
            baseLocked[msg.sender] += amount;
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

        // Match against existing orders
        uint256 remaining = _matchOrders(orderId, maxFills);

        if (remaining > 0) {
            // Rest remainder in book
            _insertPriceLevel(side, price, hintPrice);
            _addOrderToLevel(side, price, orderId);
            _addOrderToUser(msg.sender, orderId);
            emit OrderPlaced(orderId, msg.sender, side, price, amount);
        } else {
            // Fully filled, clean up
            _removeOrderFromUser(msg.sender, orderId);
            // Refund unused fee headroom for buys
            if (side == Side.BUY) {
                uint256 quoteAmount = (amount * price) / PRICE_SCALE;
                uint256 maxFee = (quoteAmount * takerFeeBps) / 10000;
                // Actual fee paid is tracked in feeBalance, but we locked max fee
                // The difference between locked and actual fee is already handled in _executeTrade
                // No additional refund needed here since _executeTrade handles it
            }
            emit OrderPlaced(orderId, msg.sender, side, price, amount);
        }
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
        if (order.side == Side.BUY) {
            // Buy: unlock quote for remaining notional + full fee headroom (since maker doesn't pay fee)
            // Total locked = quoteAmount_total + maxFee_total
            // During matching, only notional was reduced for fills
            // So remaining locked = quoteAmount_remaining + maxFee_total
            uint256 quoteAmountTotal = (order.amount * order.price) / PRICE_SCALE;
            uint256 maxFeeTotal = (quoteAmountTotal * takerFeeBps) / 10000;
            uint256 quoteAmountFilled = (order.filled * order.price) / PRICE_SCALE;
            uint256 quoteAmountRemaining = quoteAmountTotal - quoteAmountFilled;
            uint256 totalLocked = quoteAmountRemaining + maxFeeTotal;
            quoteLocked[msg.sender] -= totalLocked;
            quoteFree[msg.sender] += totalLocked;
        } else {
            // Sell: unlock base (maker pays no fee, so base locked exactly matches remaining)
            baseLocked[msg.sender] -= remaining;
            baseFree[msg.sender] += remaining;
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
        return UserBalances({
            baseFree: baseFree[user],
            baseLocked: baseLocked[user],
            quoteFree: quoteFree[user],
            quoteLocked: quoteLocked[user]
        });
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
