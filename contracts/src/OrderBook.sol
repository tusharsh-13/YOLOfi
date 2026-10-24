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
            current = orders[current].next;
        }

        uint64[] memory result = new uint64[](count);
        current = head;
        for (uint256 i = 0; i < count; i++) {
            result[i] = current;
            current = orders[current].next;
        }
        return result;
    }

    function getSpread() external view override returns (uint256 bestBid_, uint256 bestAsk_) {
        return (bestBid, bestAsk);
    }

    // ============ Placeholder Functions (Phase 2+) ============
    function placeLimitOrder(Side side, uint256 price, uint256 amount, uint256 maxFills, uint256 hintPrice)
        external
        override
        returns (uint64 orderId)
    {
        // Phase 2 implementation
        return 0;
    }

    function cancelOrder(uint64 orderId) external override {
        // Phase 2 implementation
    }

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
