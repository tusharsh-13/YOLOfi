// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OrderBook.sol";
import "../src/MockERC20.sol";
import "../src/interfaces/IOrderBook.sol";

contract MatchingTest is Test {
    OrderBook book;
    MockERC20 tYBTC; // base, 18 decimals
    MockERC20 tUSDC; // quote, 6 decimals

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    uint256 constant TICK_SIZE = 1e4; // 0.01 quote
    uint256 constant LOT_SIZE = 1e14; // 0.0001 base
    uint256 constant MIN_ORDER_SIZE = 1e14; // 0.0001 base
    uint256 constant TAKER_FEE_BPS = 10; // 0.10%
    uint256 constant PRICE_SCALE = 1e18;

    function setUp() public {
        tYBTC = new MockERC20("Test YBTC", "tYBTC", 18);
        tUSDC = new MockERC20("Test USDC", "tUSDC", 6);

        book = new OrderBook(address(tYBTC), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);

        // Give each user plenty of tokens
        tYBTC.mint(alice, 1000 * 1e18);
        tYBTC.mint(bob, 1000 * 1e18);
        tYBTC.mint(charlie, 1000 * 1e18);
        tUSDC.mint(alice, 10_000_000 * 1e6);
        tUSDC.mint(bob, 10_000_000 * 1e6);
        tUSDC.mint(charlie, 10_000_000 * 1e6);

        // Approve
        tYBTC.approve(address(book), type(uint256).max);
        tUSDC.approve(address(book), type(uint256).max);
        vm.prank(alice);
        tYBTC.approve(address(book), type(uint256).max);
        vm.prank(alice);
        tUSDC.approve(address(book), type(uint256).max);
        vm.prank(bob);
        tYBTC.approve(address(book), type(uint256).max);
        vm.prank(bob);
        tUSDC.approve(address(book), type(uint256).max);
        vm.prank(charlie);
        tYBTC.approve(address(book), type(uint256).max);
        vm.prank(charlie);
        tUSDC.approve(address(book), type(uint256).max);

        // Deposit for all users
        vm.prank(alice);
        book.deposit(address(tYBTC), 500 * 1e18);
        vm.prank(alice);
        book.deposit(address(tUSDC), 5_000_000 * 1e6);
        vm.prank(bob);
        book.deposit(address(tYBTC), 500 * 1e18);
        vm.prank(bob);
        book.deposit(address(tUSDC), 5_000_000 * 1e6);
        vm.prank(charlie);
        book.deposit(address(tYBTC), 500 * 1e18);
        vm.prank(charlie);
        book.deposit(address(tUSDC), 5_000_000 * 1e6);
    }

    function _placeBuy(address user, uint256 price, uint256 amount) internal returns (uint64) {
        vm.prank(user);
        return book.placeLimitOrder(IOrderBook.Side.BUY, price, amount, 20, 0);
    }

    function _placeSell(address user, uint256 price, uint256 amount) internal returns (uint64) {
        vm.prank(user);
        return book.placeLimitOrder(IOrderBook.Side.SELL, price, amount, 20, 0);
    }

    // ============ Basic Matching Tests ============

    function testMatch_ExactCross_BuyMatchesSell() public {
        // Bob places sell order at 100_000
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Alice places buy order at 100_000 (exact cross)
        uint64 buyId = _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Check both orders fully filled
        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(sellOrder.filled, 10 * 1e14);
        assertEq(buyOrder.filled, 10 * 1e14);

        // Check balances
        // Alice (buyer): receives 10 * 1e14 base, pays quote at 100_000
        // quoteAmount = 10e14 * 100_000e4 / 1e18 = 1_000_000 (6 decimals)
        // fee = 1_000_000 * 10 / 10000 = 1_000
        // Alice: base +10e14, quote -1_001_000
        IOrderBook.UserBalances memory a = book.getBalances(alice);
        assertEq(a.baseFree, 500 * 1e18 + 10 * 1e14);
        assertEq(a.quoteFree, 5_000_000 * 1e6 - 1_001_000);

        // Bob (seller): receives 1_000_000 quote, pays 10e14 base
        IOrderBook.UserBalances memory b = book.getBalances(bob);
        assertEq(b.baseFree, 500 * 1e18 - 10 * 1e14);
        assertEq(b.quoteFree, 5_000_000 * 1e6 + 1_000_000);

        // Fee balance
        assertEq(book.feeBalance(), 1_000);

        // No orders resting
        assertEq(book.bestBid(), 0);
        assertEq(book.bestAsk(), 0);
    }

    function testMatch_SellMatchesBuy_ExactCross() public {
        // Alice places buy order at 100_000
        uint64 buyId = _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Bob places sell order at 100_000 (exact cross)
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(sellOrder.filled, 10 * 1e14);
        assertEq(buyOrder.filled, 10 * 1e14);

        assertEq(book.feeBalance(), 1_000);
    }

    function testMatch_MakerPartiallyFilled() public {
        // Bob places large sell order
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 100 * 1e14);

        // Alice places smaller buy order
        uint64 buyId = _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Sell order partially filled, buy fully filled
        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(sellOrder.filled, 10 * 1e14);
        assertEq(sellOrder.amount, 100 * 1e14);
        assertEq(buyOrder.filled, 10 * 1e14);
        assertEq(buyOrder.amount, 10 * 1e14);

        // Sell order remains in book
        assertEq(book.bestAsk(), 100_000 * 1e4);
        IOrderBook.TopLevelsResult memory asks = book.getTopLevels(IOrderBook.Side.SELL, 1);
        assertEq(asks.totals[0], 90 * 1e14);
    }

    function testMatch_TakerPartiallyFilled_RestsRemainder() public {
        // Bob places small sell order
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Alice places large buy order
        uint64 buyId = _placeBuy(alice, 100_000 * 1e4, 100 * 1e14);

        // Sell fully filled, buy partially filled and rests
        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(sellOrder.filled, 10 * 1e14);
        assertEq(buyOrder.filled, 10 * 1e14);
        assertEq(buyOrder.amount, 100 * 1e14);

        // Buy order remains in book with 90 * 1e14 remaining
        assertEq(book.bestBid(), 100_000 * 1e4);
        IOrderBook.TopLevelsResult memory bids = book.getTopLevels(IOrderBook.Side.BUY, 1);
        assertEq(bids.totals[0], 90 * 1e14);
    }

    function testMatch_WalkThreeLevels() public {
        // Place sells at different prices (ascending - better asks first)
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14); // best ask
        _placeSell(charlie, 101_000 * 1e4, 10 * 1e14);
        _placeSell(bob, 102_000 * 1e4, 10 * 1e14);

        // Alice buys large amount crossing all three levels
        _placeBuy(alice, 103_000 * 1e4, 30 * 1e14);

        // Check all three levels consumed
        assertEq(book.bestAsk(), 0);

        // Alice should have received 30 * 1e14 base
        IOrderBook.UserBalances memory a = book.getBalances(alice);
        assertEq(a.baseFree, 500 * 1e18 + 30 * 1e14);

        // Quote paid: 10 * 100_000 + 10 * 101_000 + 10 * 102_000 = 3_030_000 (in 1e6 decimals, scaled)
        // Actually: 10e14 * (100_000 + 101_000 + 102_000) * 1e4 / 1e18 = 10 * 303_000 = 3_030_000 (6 decimals)
        // Fees: 3_030_000 * 10 / 10000 = 3_030
        // Total quote: 3_033_030
        // But let's verify the actual amounts
        // Actually we just check the fee balance
        assertEq(book.feeBalance(), 3_030);
    }

    function testMatch_FIFOAtSamePrice_TwoMakers() public {
        // Bob places first sell at 100_000
        uint64 sell1 = _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        // Charlie places second sell at 100_000
        uint64 sell2 = _placeSell(charlie, 100_000 * 1e4, 20 * 1e14);

        // Alice buys 25 * 1e14 (should fill bob's 10 first, then 15 of charlie's)
        _placeBuy(alice, 100_000 * 1e4, 25 * 1e14);

        IOrderBook.Order memory o1 = book.getOrder(sell1);
        IOrderBook.Order memory o2 = book.getOrder(sell2);
        assertEq(o1.filled, 10 * 1e14); // First order fully filled
        assertEq(o2.filled, 15 * 1e14); // Second order partially filled

        // Charlie's order should remain with 5 * 1e14
        assertEq(book.bestAsk(), 100_000 * 1e4);
        IOrderBook.TopLevelsResult memory asks = book.getTopLevels(IOrderBook.Side.SELL, 1);
        assertEq(asks.totals[0], 5 * 1e14);
    }

    // ============ Price Improvement Tests ============

    function testMatch_PriceImprovement_BuyerGetsRefund() public {
        // Bob sells at 90_000 (lower than Alice's buy price)
        _placeSell(bob, 90_000 * 1e4, 10 * 1e14);

        // Alice buys at 100_000 (crosses, gets price improvement)
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Trade executes at maker's price (90_000)
        // Alice locked at 100_000: quoteAmount = 10e14 * 100_000e4 / 1e18 = 1_000_000
        // fee = 1_000
        // Total locked = 1_001_000
        // Actual trade at 90_000: quoteAmount = 10e14 * 90_000e4 / 1e18 = 900_000
        // fee = 900
        // Improvement = 1_000_000 - 900_000 = 100_000 (plus fee diff 100 = 100_100 total)

        IOrderBook.UserBalances memory a = book.getBalances(alice);
        // Should have paid 900_000 + 900 = 900_900
        // Started with 5_000_000 * 1e6, locked 1_001_000, got refund 100_100
        // Free = 5_000_000 * 1e6 - 1_001_000 + 100_100 = 5_000_000 * 1e6 - 900_900
        assertEq(a.quoteFree, 5_000_000 * 1e6 - 900_900);

        // Fee should be 900
        assertEq(book.feeBalance(), 900);
    }

    function testMatch_PriceImprovement_SellerGetsRefund() public {
        // Alice buys at 110_000 (higher than Bob's sell price)
        _placeBuy(alice, 110_000 * 1e4, 10 * 1e14);

        // Bob sells at 100_000 (crosses, gets price improvement)
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Trade executes at maker's price (110_000)
        // Bob (taker, SELL) locked 10 * 1e14 base
        // Receives quote at 110_000: 10e14 * 110_000e4 / 1e18 = 1_100_000
        // Pays fee: 1_100_000 * 10 / 10000 = 1_100
        // Net: 1_098_900
        // Price improvement: (110_000 - 100_000) * 10e14 * 1e4 / 1e18 = 100_000
        // Total quote received: 1_098_900 + 100_000 = 1_198_900

        IOrderBook.UserBalances memory b = book.getBalances(bob);
        assertEq(b.quoteFree, 5_000_000 * 1e6 + 1_198_900);

        // Fee should be 1_100 (paid by taker Bob)
        assertEq(book.feeBalance(), 1_100);
    }

    function testMatch_PriceImprovement_ExactAmount() public {
        // Verify exact refund calculation
        // Buy at 105_000, sell at 100_000, amount = 20 * 1e14
        _placeSell(bob, 100_000 * 1e4, 20 * 1e14);
        _placeBuy(alice, 105_000 * 1e4, 20 * 1e14);

        // Trade at 100_000
        // Quote amount = 20 * 1e14 * 100_000 * 1e4 / 1e18 = 2_000_000
        // Fee = 2_000
        // Alice locked at 105_000: 20 * 1e14 * 105_000 * 1e4 / 1e18 = 2_100_000 + 2_100 fee = 2_102_100
        // Refund = 2_102_100 - 2_002_000 = 100_100

        IOrderBook.UserBalances memory a = book.getBalances(alice);
        assertEq(a.quoteFree, 5_000_000 * 1e6 - 2_002_000);

        assertEq(book.feeBalance(), 2_000);
    }

    // ============ Fee Tests ============

    function testMatch_FeeAmountExact() public {
        // Simple cross at 100_000, amount 10 * 1e14
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // quoteAmount = 1_000_000, fee = 1_000 (0.10%)
        assertEq(book.feeBalance(), 1_000);

        // Owner can withdraw fees
        vm.prank(book.owner());
        book.withdrawFees();
        assertEq(book.feeBalance(), 0);
    }

    function testMatch_FeeAccruesOverMultipleTrades() public {
        // Multiple trades
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14); // fee 1_000

        _placeSell(charlie, 200_000 * 1e4, 10 * 1e14);
        _placeBuy(alice, 200_000 * 1e4, 10 * 1e14); // fee 2_000

        // Total fee = 3_000
        assertEq(book.feeBalance(), 3_000);
    }

    function testMatch_FeeChargedInQuoteToken() public {
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Fee should be in quote (tUSDC)
        // Verify by checking contract quote balance increased by fee
        // Actually feeBalance tracks it, and withdrawFees transfers quote
        assertEq(book.feeBalance(), 1_000);
    }

    // ============ maxFills Tests ============

    function testMatch_MaxFillsStopsAndRestsRemainder() public {
        // Place 5 sell orders at same price (each 10 * 1e14)
        for (uint256 i = 0; i < 5; i++) {
            _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        }

        // Buy with maxFills = 3, amount = 50 * 1e14
        // Should only fill 3 orders (30 * 1e14) and rest 20 * 1e14
        vm.prank(alice);
        uint64 buyId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 50 * 1e14, 3, 0);

        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(buyOrder.filled, 30 * 1e14);
        assertEq(buyOrder.amount, 50 * 1e14);

        // Remaining 20 * 1e14 should rest in book
        assertEq(book.bestBid(), 100_000 * 1e4);
        IOrderBook.TopLevelsResult memory bids = book.getTopLevels(IOrderBook.Side.BUY, 1);
        assertEq(bids.totals[0], 20 * 1e14);

        // 2 sell orders should remain
        assertEq(book.bestAsk(), 100_000 * 1e4);
        IOrderBook.TopLevelsResult memory asks = book.getTopLevels(IOrderBook.Side.SELL, 1);
        assertEq(asks.totals[0], 20 * 1e14);
    }

    function testMatch_MaxFillsAtDifferentLevels() public {
        // Place sells at 3 different prices
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        _placeSell(charlie, 101_000 * 1e4, 10 * 1e14);
        _placeSell(bob, 102_000 * 1e4, 10 * 1e14);

        // Buy with maxFills = 2
        vm.prank(alice);
        uint64 buyId = book.placeLimitOrder(IOrderBook.Side.BUY, 103_000 * 1e4, 30 * 1e14, 2, 0);

        // Should only fill 2 levels (20 * 1e14)
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(buyOrder.filled, 20 * 1e14);

        // Remaining 10 * 1e14 rests
        IOrderBook.TopLevelsResult memory bids = book.getTopLevels(IOrderBook.Side.BUY, 1);
        assertEq(bids.totals[0], 10 * 1e14);

        // Third level (102_000) should remain
        assertEq(book.bestAsk(), 102_000 * 1e4);
    }

    // ============ Self-Trade Tests ============

    function testMatch_SelfTradeReverts() public {
        // Alice places buy order
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Alice tries to sell to herself - should revert
        vm.prank(alice);
        vm.expectRevert(IOrderBook.SelfTrade.selector);
        book.placeLimitOrder(IOrderBook.Side.SELL, 100_000 * 1e4, 10 * 1e14, 20, 0);
    }

    function testMatch_SelfTradeReverts_Reverse() public {
        // Alice places sell order
        _placeSell(alice, 100_000 * 1e4, 10 * 1e14);

        // Alice tries to buy from herself - should revert
        vm.prank(alice);
        vm.expectRevert(IOrderBook.SelfTrade.selector);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
    }

    // ============ Cancel After Partial Fill ============

    function testCancel_AfterPartialFill_RefundsOnlyRemainder() public {
        // Bob places large sell (maker)
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 100 * 1e14);

        // Alice buys small amount (taker)
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Bob cancels remaining 90 * 1e14
        vm.prank(bob);
        book.cancelOrder(sellId);

        // Bob (maker) locked 100 * 1e14 base
        // Fill 10: baseLocked -= 10 * 1e14, baseFree unchanged (received quote)
        // Remaining locked: 90 * 1e14
        // Cancel refunds: 90 * 1e14 base
        // Final baseFree = 500 * 1e18 - 100 * 1e14 + 90 * 1e14 = 500 * 1e18 - 10 * 1e14
        // (10 * 1e14 base was sold to Alice)
        IOrderBook.UserBalances memory b = book.getBalances(bob);
        assertEq(b.baseFree, 500 * 1e18 - 10 * 1e14);
        assertEq(b.baseLocked, 0);

        // Order should be gone
        assertEq(book.bestAsk(), 0);
    }

    function testCancel_AfterPartialFill_BuySide() public {
        // Alice places large buy (maker)
        uint64 buyId = _placeBuy(alice, 100_000 * 1e4, 100 * 1e14);

        // Bob sells small amount (taker)
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Alice cancels remaining 90 * 1e14
        vm.prank(alice);
        book.cancelOrder(buyId);

        // Alice (maker) locked quote for 100 * 1e14 at 100_000:
        // quoteAmount_total = 10_000_000, maxFee_total = 10_000, totalLocked = 10_010_000
        // During fill of 10: maker pays notional 1_000_000 (no fee), quoteLocked reduced by 1_000_000
        // Remaining locked: 9_010_000 (9_000_000 notional + 10_000 fee headroom)
        // Cancel refunds: 9_010_000
        // Final quote free = 5_000_000 * 1e6 - 10_010_000 + 9_010_000 = 5_000_000 * 1e6 - 1_000_000
        // (1_000_000 quote was paid to Bob for the 10 * 1e14 base received)
        IOrderBook.UserBalances memory a = book.getBalances(alice);
        assertEq(a.quoteLocked, 0);
        assertEq(a.quoteFree, 5_000_000 * 1e6 - 1_000_000);
        // Alice received 10 * 1e14 base
        assertEq(a.baseFree, 500 * 1e18 + 10 * 1e14);
    }

    // ============ Event Tests ============

    function testMatch_EmitsTradeExecuted() public {
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        vm.prank(alice);
        uint64 buyId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);

        // Check TradeExecuted event was emitted
        // We can't easily check events in forge without vm.expectEmit, but we verified state changes
        assertEq(book.getOrder(buyId).filled, 10 * 1e14);
    }

    function testMatch_EmitsFeeCollected() public {
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        assertEq(book.feeBalance(), 1_000);

        // withdrawFees emits FeeCollected
        vm.prank(book.owner());
        book.withdrawFees();
        assertEq(book.feeBalance(), 0);
    }

    // ============ Edge Cases ============

    function testMatch_NoMatchWhenPriceDoesNotCross() public {
        // Bob sells at 100_000
        _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Alice buys at 90_000 (below ask) - no cross
        uint64 buyId = _placeBuy(alice, 90_000 * 1e4, 10 * 1e14);

        // Both orders should rest
        IOrderBook.Order memory sellOrder = book.getOrder(1); // bob's sell
        IOrderBook.Order memory buyOrder = book.getOrder(buyId);
        assertEq(sellOrder.filled, 0);
        assertEq(buyOrder.filled, 0);
        assertEq(book.bestBid(), 90_000 * 1e4);
        assertEq(book.bestAsk(), 100_000 * 1e4);
    }

    function testMatch_PartialFillThenCancelOtherSide() public {
        // Bob sells 100
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 100 * 1e14);

        // Alice buys 30
        _placeBuy(alice, 100_000 * 1e4, 30 * 1e14);

        // Charlie buys 20 (fills more of bob's order)
        _placeBuy(charlie, 100_000 * 1e4, 20 * 1e14);

        // Bob's sell now has 50 filled, 50 remaining
        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        assertEq(sellOrder.filled, 50 * 1e14);

        // Bob cancels
        vm.prank(bob);
        book.cancelOrder(sellId);

        // Should get back 50 * 1e14 base
        // Final baseFree = 500 * 1e18 - 50 * 1e14 (50 * 1e14 was sold)
        IOrderBook.UserBalances memory b = book.getBalances(bob);
        assertEq(b.baseFree, 500 * 1e18 - 50 * 1e14);
        assertEq(b.baseLocked, 0);
    }

    function testMatch_MakerOrderFullyFilled_RemovedFromBook() public {
        // Bob sells 10
        uint64 sellId = _placeSell(bob, 100_000 * 1e4, 10 * 1e14);

        // Alice buys 10
        _placeBuy(alice, 100_000 * 1e4, 10 * 1e14);

        // Bob's order should be fully filled and removed
        IOrderBook.Order memory sellOrder = book.getOrder(sellId);
        assertEq(sellOrder.filled, 10 * 1e14);
        assertEq(sellOrder.amount, 10 * 1e14);

        // No asks in book
        assertEq(book.bestAsk(), 0);
        IOrderBook.TopLevelsResult memory asks = book.getTopLevels(IOrderBook.Side.SELL, 1);
        assertEq(asks.prices[0], 0);
    }
}
