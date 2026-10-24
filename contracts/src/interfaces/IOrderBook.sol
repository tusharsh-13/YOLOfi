// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IOrderBook
/// @notice Interface for a fully onchain central limit order book (CLOB)
interface IOrderBook {
    // ============ Enums ============
    enum Side {
        BUY,
        SELL
    }

    // ============ Structs ============
    struct Order {
        uint64 id;
        address owner;
        Side side;
        uint256 price;
        uint256 amount;
        uint256 filled;
        uint64 prev; // For price level FIFO
        uint64 next; // For price level FIFO
        uint64 userPrev; // For user's order list
        uint64 userNext; // For user's order list
    }

    struct PriceLevel {
        uint64 head;
        uint64 tail;
        uint256 totalRemaining;
    }

    struct UserBalances {
        uint256 baseFree;
        uint256 baseLocked;
        uint256 quoteFree;
        uint256 quoteLocked;
    }

    struct TopLevelsResult {
        uint256[] prices;
        uint256[] totals;
    }

    // ============ Events ============
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event OrderPlaced(uint64 indexed orderId, address indexed owner, Side side, uint256 price, uint256 amount);
    event OrderCancelled(uint64 indexed orderId, address indexed owner, uint256 remaining);
    event TradeExecuted(
        uint64 indexed makerOrderId,
        uint64 indexed takerOrderId,
        address indexed maker,
        address taker,
        uint256 price,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );
    event FeeCollected(uint256 amount);

    // ============ Custom Errors ============
    error ZeroAmount();
    error InvalidToken(address token);
    error InsufficientBalance(uint256 available, uint256 required);
    error InvalidTickSize(uint256 price, uint256 tickSize);
    error InvalidLotSize(uint256 amount, uint256 lotSize);
    error BelowMinOrderSize(uint256 amount, uint256 minOrderSize);
    error OrderNotFound(uint64 orderId);
    error NotOrderOwner(uint64 orderId, address owner);
    error SelfTrade();
    error InvalidMaxFills(uint256 maxFills);
    error BookCrossed();
    error ExceedsFeeLimit(uint256 feeBps);

    // ============ View Functions ============
    function base() external view returns (address);
    function quote() external view returns (address);
    function tickSize() external view returns (uint256);
    function lotSize() external view returns (uint256);
    function minOrderSize() external view returns (uint256);
    function takerFeeBps() external view returns (uint256);
    function feeBalance() external view returns (uint256);
    function owner() external view returns (address);
    function orderCount() external view returns (uint64);
    function bestBid() external view returns (uint256);
    function bestAsk() external view returns (uint256);

    function getOrder(uint64 orderId) external view returns (Order memory);
    function getBalances(address user) external view returns (UserBalances memory);
    function getTopLevels(Side side, uint256 n) external view returns (TopLevelsResult memory);
    function getUserOrders(address user) external view returns (uint64[] memory);
    function getSpread() external view returns (uint256 bestBid, uint256 bestAsk);

    // ============ State-Changing Functions ============
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;

    function placeLimitOrder(Side side, uint256 price, uint256 amount, uint256 maxFills, uint256 hintPrice)
        external
        returns (uint64 orderId);

    function cancelOrder(uint64 orderId) external;

    function setFee(uint256 newFeeBps) external;
    function withdrawFees() external;
}
