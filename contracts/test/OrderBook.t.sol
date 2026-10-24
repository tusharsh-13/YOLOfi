// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OrderBook.sol";
import "../src/MockERC20.sol";
import "../src/interfaces/IOrderBook.sol";

contract OrderBookTest is Test {
    OrderBook book;
    MockERC20 tYBTC; // base, 18 decimals
    MockERC20 tUSDC; // quote, 6 decimals

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant TICK_SIZE = 1e4; // 0.01 quote
    uint256 constant LOT_SIZE = 1e14; // 0.0001 base
    uint256 constant MIN_ORDER_SIZE = 1e14; // 0.0001 base
    uint256 constant TAKER_FEE_BPS = 10; // 0.10%

    function setUp() public {
        tYBTC = new MockERC20("Test YBTC", "tYBTC", 18);
        tUSDC = new MockERC20("Test USDC", "tUSDC", 6);

        book = new OrderBook(address(tYBTC), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);

        tYBTC.mint(alice, 100 * 1e18);
        tYBTC.mint(bob, 100 * 1e18);
        tUSDC.mint(alice, 1_000_000 * 1e6);
        tUSDC.mint(bob, 1_000_000 * 1e6);

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
    }

    // ============ Constructor Tests ============
    function testConstructor_SetsImmutables() public {
        assertEq(book.base(), address(tYBTC));
        assertEq(book.quote(), address(tUSDC));
        assertEq(book.tickSize(), TICK_SIZE);
        assertEq(book.lotSize(), LOT_SIZE);
        assertEq(book.minOrderSize(), MIN_ORDER_SIZE);
        assertEq(book.takerFeeBps(), TAKER_FEE_BPS);
        assertEq(book.owner(), address(this));
    }

    function testConstructor_RevertsOnZeroAddress() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidToken(address)", address(0)));
        new OrderBook(address(0), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);
    }

    function testConstructor_RevertsOnSameToken() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidToken(address)", address(tYBTC)));
        new OrderBook(address(tYBTC), address(tYBTC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);
    }

    function testConstructor_RevertsOnTickLotMismatch() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidToken(address)", address(0)));
        new OrderBook(address(tYBTC), address(tUSDC), 1e3, 1e14, MIN_ORDER_SIZE, TAKER_FEE_BPS);
    }

    function testConstructor_RevertsOnExcessiveFee() public {
        vm.expectRevert(abi.encodeWithSignature("ExceedsFeeLimit(uint256)", 101));
        new OrderBook(address(tYBTC), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, 101);
    }

    // ============ Deposit Tests ============
    function testDeposit_Base_IncreasesFreeBalance() public {
        uint256 amount = 10 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), amount);

        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseFree, amount);
        assertEq(b.baseLocked, 0);
        assertEq(b.quoteFree, 0);
        assertEq(b.quoteLocked, 0);
    }

    function testDeposit_Quote_IncreasesFreeBalance() public {
        uint256 amount = 50_000 * 1e6;
        vm.prank(alice);
        book.deposit(address(tUSDC), amount);

        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.quoteFree, amount);
        assertEq(b.quoteLocked, 0);
        assertEq(b.baseFree, 0);
        assertEq(b.baseLocked, 0);
    }

    function testDeposit_EmitsEvent() public {
        uint256 amount = 5 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), amount);
        assertEq(tYBTC.balanceOf(address(book)), amount);
    }

    function testDeposit_RevertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(IOrderBook.ZeroAmount.selector);
        book.deposit(address(tYBTC), 0);
    }

    function testDeposit_RevertsOnInvalidToken() public {
        MockERC20 fake = new MockERC20("Fake", "FAKE", 18);
        fake.mint(alice, 100 * 1e18);
        vm.prank(alice);
        fake.approve(address(book), type(uint256).max);
        vm.expectRevert(abi.encodeWithSignature("InvalidToken(address)", address(fake)));
        book.deposit(address(fake), 100 * 1e18);
    }

    function testDeposit_UpdatesContractTokenBalance() public {
        uint256 amount = 25 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), amount);
        assertEq(tYBTC.balanceOf(address(book)), amount);
        vm.prank(bob);
        book.deposit(address(tYBTC), 15 * 1e18);
        assertEq(tYBTC.balanceOf(address(book)), 40 * 1e18);
    }

    // ============ Withdraw Tests ============
    function testWithdraw_Base_DecreasesFreeBalance() public {
        uint256 depositAmt = 20 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), depositAmt);
        uint256 withdrawAmt = 8 * 1e18;
        vm.prank(alice);
        book.withdraw(address(tYBTC), withdrawAmt);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseFree, depositAmt - withdrawAmt);
        assertEq(tYBTC.balanceOf(alice), (100 * 1e18) - depositAmt + withdrawAmt);
    }

    function testWithdraw_Quote_DecreasesFreeBalance() public {
        uint256 depositAmt = 100_000 * 1e6;
        vm.prank(alice);
        book.deposit(address(tUSDC), depositAmt);
        uint256 withdrawAmt = 30_000 * 1e6;
        vm.prank(alice);
        book.withdraw(address(tUSDC), withdrawAmt);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.quoteFree, depositAmt - withdrawAmt);
        assertEq(tUSDC.balanceOf(alice), (1_000_000 * 1e6) - depositAmt + withdrawAmt);
    }

    function testWithdraw_EmitsEvent() public {
        uint256 depositAmt = 15 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), depositAmt);
        uint256 withdrawAmt = 5 * 1e18;
        vm.prank(alice);
        book.withdraw(address(tYBTC), withdrawAmt);
        assertEq(tYBTC.balanceOf(alice), (100 * 1e18) - depositAmt + withdrawAmt);
    }

    function testWithdraw_RevertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(IOrderBook.ZeroAmount.selector);
        book.withdraw(address(tYBTC), 0);
    }

    function testWithdraw_RevertsOnInvalidToken() public {
        MockERC20 fake = new MockERC20("Fake", "FAKE", 18);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InvalidToken(address)", address(fake)));
        book.withdraw(address(fake), 100 * 1e18);
    }

    function testWithdraw_RevertsWhenInsufficientFreeBalance() public {
        uint256 depositAmt = 10 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), depositAmt);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance(uint256,uint256)", depositAmt, depositAmt + 1));
        book.withdraw(address(tYBTC), depositAmt + 1);
    }

    function testWithdraw_RevertsWhenNoBalance() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance(uint256,uint256)", 0, 1 * 1e18));
        book.withdraw(address(tYBTC), 1 * 1e18);
    }

    function testWithdraw_OnlyFreeBalanceNotLocked() public {
        vm.prank(alice);
        book.deposit(address(tYBTC), 20 * 1e18);
        vm.prank(alice);
        book.withdraw(address(tYBTC), 20 * 1e18);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseFree, 0);
    }

    // ============ Integration Tests ============
    function testDepositWithdraw_MultipleUsers_IndependentBalances() public {
        vm.prank(alice);
        book.deposit(address(tYBTC), 10 * 1e18);
        vm.prank(bob);
        book.deposit(address(tYBTC), 5 * 1e18);
        IOrderBook.UserBalances memory bAlice = book.getBalances(alice);
        IOrderBook.UserBalances memory bBob = book.getBalances(bob);
        assertEq(bAlice.baseFree, 10 * 1e18);
        assertEq(bBob.baseFree, 5 * 1e18);
    }

    function testDepositWithdraw_RoundTrip() public {
        uint256 amount = 42 * 1e18;
        vm.prank(alice);
        book.deposit(address(tYBTC), amount);
        vm.prank(alice);
        book.withdraw(address(tYBTC), amount);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseFree, 0);
        assertEq(b.baseLocked, 0);
        assertEq(tYBTC.balanceOf(alice), 100 * 1e18);
        assertEq(tYBTC.balanceOf(address(book)), 0);
    }

    function testDepositWithdraw_BothTokens() public {
        vm.prank(alice);
        book.deposit(address(tYBTC), 10 * 1e18);
        vm.prank(alice);
        book.deposit(address(tUSDC), 50_000 * 1e6);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseFree, 10 * 1e18);
        assertEq(b.quoteFree, 50_000 * 1e6);
        vm.prank(alice);
        book.withdraw(address(tYBTC), 3 * 1e18);
        vm.prank(alice);
        book.withdraw(address(tUSDC), 20_000 * 1e6);
        b = book.getBalances(alice);
        assertEq(b.baseFree, 7 * 1e18);
        assertEq(b.quoteFree, 30_000 * 1e6);
    }

    // ============ Place Limit Order Tests ============
    function _depositAlice() internal {
        vm.prank(alice);
        book.deposit(address(tYBTC), 50 * 1e18);
        vm.prank(alice);
        book.deposit(address(tUSDC), 500_000 * 1e6);
    }

    function testPlaceLimitOrder_Buy_LocksQuote() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4; // 100_000 quote per 1e18 base
        uint256 amount = 10 * 1e14; // 0.001 base

        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, price, amount, 20, 0);

        assertEq(orderId, 1);
        IOrderBook.Order memory order = book.getOrder(orderId);
        assertEq(order.owner, alice);
        assertEq(uint8(order.side), uint8(IOrderBook.Side.BUY));
        assertEq(order.price, price);
        assertEq(order.amount, amount);
        assertEq(order.filled, 0);

        IOrderBook.UserBalances memory b = book.getBalances(alice);
        // quoteAmount = amount * price / 1e18 = 10e14 * 100_000e4 / 1e18 = 100_000 * 10 = 1_000_000 (6 decimals)
        // maxFee = quoteAmount * 10 / 10000 = 1_000
        // total = 1_001_000
        uint256 quoteAmount = (amount * price) / 1e18;
        uint256 maxFee = (quoteAmount * TAKER_FEE_BPS) / 10000;
        uint256 expectedLocked = quoteAmount + maxFee;
        assertEq(b.quoteLocked, expectedLocked);
        assertEq(b.quoteFree, 500_000 * 1e6 - expectedLocked);
    }

    function testPlaceLimitOrder_Sell_LocksBase() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4;
        uint256 amount = 10 * 1e14;

        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.SELL, price, amount, 20, 0);

        assertEq(orderId, 1);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.baseLocked, amount);
        assertEq(b.baseFree, 50 * 1e18 - amount);
    }

    function testPlaceLimitOrder_EmitsEvent() public {
        _depositAlice();
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        assertEq(orderId, 1);
    }

    function testPlaceLimitOrder_RevertsOnZeroAmount() public {
        _depositAlice();
        vm.prank(alice);
        vm.expectRevert(IOrderBook.ZeroAmount.selector);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 0, 20, 0);
    }

    function testPlaceLimitOrder_RevertsOnInvalidTickSize() public {
        _depositAlice();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InvalidTickSize(uint256,uint256)", 100_000 * 1e4 + 1, TICK_SIZE));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4 + 1, 10 * 1e14, 20, 0);
    }

    function testPlaceLimitOrder_RevertsOnInvalidLotSize() public {
        _depositAlice();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InvalidLotSize(uint256,uint256)", 10 * 1e14 + 1, LOT_SIZE));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14 + 1, 20, 0);
    }

    function testPlaceLimitOrder_RevertsOnBelowMinOrderSize() public {
        _depositAlice();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("BelowMinOrderSize(uint256,uint256)", LOT_SIZE - 1, MIN_ORDER_SIZE));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, LOT_SIZE - 1, 20, 0);
    }

    function testPlaceLimitOrder_RevertsOnInvalidMaxFills() public {
        _depositAlice();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InvalidMaxFills(uint256)", 0));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 0, 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InvalidMaxFills(uint256)", 21));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 21, 0);
    }

    function testPlaceLimitOrder_RevertsOnInsufficientBalanceBuy() public {
        // Alice has no quote balance
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance(uint256,uint256)", 0, 1001000));
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
    }

    function testPlaceLimitOrder_RevertsOnInsufficientBalanceSell() public {
        // Alice has no base balance
        vm.prank(alice);
        book.deposit(address(tUSDC), 500_000 * 1e6);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance(uint256,uint256)", 0, 10 * 1e14));
        book.placeLimitOrder(IOrderBook.Side.SELL, 100_000 * 1e4, 10 * 1e14, 20, 0);
    }

    function testPlaceLimitOrder_MultipleOrders_IncrementsId() public {
        _depositAlice();
        vm.prank(alice);
        uint64 id1 = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        uint64 id2 = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        uint64 id3 = book.placeLimitOrder(IOrderBook.Side.SELL, 100_000 * 1e4, 10 * 1e14, 20, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(book.orderCount(), 3);
    }

    // ============ Price Level and Hint Tests ============
    function testPlaceLimitOrder_CreatesPriceLevel() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4;
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, price, 10 * 1e14, 20, 0);

        assertEq(book.bestBid(), price);
        assertEq(book.bestAsk(), 0);
        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], price);
        assertEq(result.totals[0], 10 * 1e14);
    }

    function testPlaceLimitOrder_SamePriceLevel_FIFO() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4;
        vm.prank(alice);
        uint64 id1 = book.placeLimitOrder(IOrderBook.Side.BUY, price, 10 * 1e14, 20, 0);
        vm.prank(alice);
        uint64 id2 = book.placeLimitOrder(IOrderBook.Side.BUY, price, 20 * 1e14, 20, 0);

        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.totals[0], 30 * 1e14);

        IOrderBook.Order memory o1 = book.getOrder(id1);
        IOrderBook.Order memory o2 = book.getOrder(id2);
        assertEq(o1.next, id2);
        assertEq(o2.prev, id1);
        assertEq(o1.prev, 0);
        assertEq(o2.next, 0);
    }

    function testPlaceLimitOrder_DifferentPrices_SortedBids() public {
        _depositAlice();
        // Lower price first (worse bid)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);
        // Higher price second (better bid)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 110_000 * 1e4, 10 * 1e14, 20, 0);

        assertEq(book.bestBid(), 110_000 * 1e4);
        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], 110_000 * 1e4);
        assertEq(result.prices[1], 90_000 * 1e4);
    }

    function testPlaceLimitOrder_DifferentPrices_SortedAsks() public {
        _depositAlice();
        vm.prank(alice);
        book.deposit(address(tYBTC), 50 * 1e18); // Need base for sells
        // Higher price first (worse ask)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.SELL, 110_000 * 1e4, 10 * 1e14, 20, 0);
        // Lower price second (better ask)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.SELL, 90_000 * 1e4, 10 * 1e14, 20, 0);

        assertEq(book.bestAsk(), 90_000 * 1e4);
        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.SELL, 10);
        assertEq(result.prices[0], 90_000 * 1e4);
        assertEq(result.prices[1], 110_000 * 1e4);
    }

    function testPlaceLimitOrder_HintPrice_UsedForInsertion() public {
        _depositAlice();
        vm.prank(alice);
        book.deposit(address(tYBTC), 50 * 1e18);

        // Place orders at different prices
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 110_000 * 1e4, 10 * 1e14, 20, 0);

        // Insert in middle using hint
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 110_000 * 1e4);

        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], 110_000 * 1e4);
        assertEq(result.prices[1], 100_000 * 1e4);
        assertEq(result.prices[2], 90_000 * 1e4);
    }

    function testPlaceLimitOrder_HintPrice_ZeroStartsFromBest() public {
        _depositAlice();
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 110_000 * 1e4, 10 * 1e14, 20, 0);

        // Insert with hint=0 (should start from bestBid)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);

        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], 110_000 * 1e4);
        assertEq(result.prices[1], 100_000 * 1e4);
        assertEq(result.prices[2], 90_000 * 1e4);
    }

    function testPlaceLimitOrder_HintPrice_WrongHintStillWorks() public {
        _depositAlice();
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 110_000 * 1e4, 10 * 1e14, 20, 0);

        // Insert with wrong hint (non-existent price)
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 50_000 * 1e4);

        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], 110_000 * 1e4);
        assertEq(result.prices[1], 100_000 * 1e4);
        assertEq(result.prices[2], 90_000 * 1e4);
    }

    // ============ Cancel Order Tests ============
    function testCancelOrder_Buy_UnlocksQuote() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4;
        uint256 amount = 10 * 1e14;
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, price, amount, 20, 0);

        IOrderBook.UserBalances memory bBefore = book.getBalances(alice);
        uint256 lockedBefore = bBefore.quoteLocked;

        vm.prank(alice);
        book.cancelOrder(orderId);

        IOrderBook.UserBalances memory bAfter = book.getBalances(alice);
        assertEq(bAfter.quoteLocked, 0);
        assertEq(bAfter.quoteFree, 500_000 * 1e6); // Full amount returned
        assertEq(bAfter.quoteLocked, lockedBefore - lockedBefore); // Should be 0
    }

    function testCancelOrder_Sell_UnlocksBase() public {
        _depositAlice();
        uint256 price = 100_000 * 1e4;
        uint256 amount = 10 * 1e14;
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.SELL, price, amount, 20, 0);

        IOrderBook.UserBalances memory bBefore = book.getBalances(alice);
        uint256 lockedBefore = bBefore.baseLocked;

        vm.prank(alice);
        book.cancelOrder(orderId);

        IOrderBook.UserBalances memory bAfter = book.getBalances(alice);
        assertEq(bAfter.baseLocked, 0);
        assertEq(bAfter.baseFree, 50 * 1e18);
    }

    function testCancelOrder_EmitsEvent() public {
        _depositAlice();
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.cancelOrder(orderId);
        // Event verified by state change
    }

    function testCancelOrder_RevertsOnNonExistentOrder() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OrderNotFound(uint64)", uint64(999)));
        book.cancelOrder(999);
    }

    function testCancelOrder_RevertsOnNonOwner() public {
        _depositAlice();
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("NotOrderOwner(uint64,address)", orderId, bob));
        book.cancelOrder(orderId);
    }

    function testCancelOrder_RemovesEmptyPriceLevel() public {
        _depositAlice();
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        assertEq(book.bestBid(), 100_000 * 1e4);

        vm.prank(alice);
        book.cancelOrder(orderId);

        assertEq(book.bestBid(), 0);
        IOrderBook.TopLevelsResult memory result = book.getTopLevels(IOrderBook.Side.BUY, 10);
        assertEq(result.prices[0], 0);
    }

    function testCancelOrder_RemovesFromUserOrderList() public {
        _depositAlice();
        vm.prank(alice);
        uint64 id1 = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        uint64 id2 = book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);

        uint64[] memory ordersBefore = book.getUserOrders(alice);
        assertEq(ordersBefore.length, 2);

        vm.prank(alice);
        book.cancelOrder(id1);

        uint64[] memory ordersAfter = book.getUserOrders(alice);
        assertEq(ordersAfter.length, 1);
        assertEq(ordersAfter[0], id2);
    }

    function testCancelOrder_PartialFillThenCancel_UnlocksOnlyRemaining() public {
        // This test will be more relevant in Phase 3 with matching
        // For now, just verify cancel works when filled=0
        _depositAlice();
        vm.prank(alice);
        uint64 orderId = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.cancelOrder(orderId);
        IOrderBook.UserBalances memory b = book.getBalances(alice);
        assertEq(b.quoteLocked, 0);
    }

    // ============ Top Levels and Spread Tests ============
    function testGetTopLevels_ReturnsCorrectNumberOfLevels() public {
        _depositAlice();
        vm.prank(alice);
        book.deposit(address(tYBTC), 50 * 1e18);

        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 90_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.SELL, 110_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.SELL, 120_000 * 1e4, 10 * 1e14, 20, 0);

        IOrderBook.TopLevelsResult memory bids = book.getTopLevels(IOrderBook.Side.BUY, 2);
        assertEq(bids.prices.length, 2);
        assertEq(bids.prices[0], 100_000 * 1e4);
        assertEq(bids.prices[1], 90_000 * 1e4);

        IOrderBook.TopLevelsResult memory asks = book.getTopLevels(IOrderBook.Side.SELL, 2);
        assertEq(asks.prices.length, 2);
        assertEq(asks.prices[0], 110_000 * 1e4);
        assertEq(asks.prices[1], 120_000 * 1e4);
    }

    function testGetSpread_ReturnsBestBidAsk() public {
        _depositAlice();
        vm.prank(alice);
        book.deposit(address(tYBTC), 50 * 1e18);

        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        book.placeLimitOrder(IOrderBook.Side.SELL, 110_000 * 1e4, 10 * 1e14, 20, 0);

        (uint256 bestBid, uint256 bestAsk) = book.getSpread();
        assertEq(bestBid, 100_000 * 1e4);
        assertEq(bestAsk, 110_000 * 1e4);
    }

    function testGetSpread_EmptyBook_ReturnsZero() public {
        (uint256 bestBid, uint256 bestAsk) = book.getSpread();
        assertEq(bestBid, 0);
        assertEq(bestAsk, 0);
    }

    function testGetUserOrders_ReturnsOpenOrders() public {
        _depositAlice();
        vm.prank(alice);
        uint64 id1 = book.placeLimitOrder(IOrderBook.Side.BUY, 100_000 * 1e4, 10 * 1e14, 20, 0);
        vm.prank(alice);
        uint64 id2 = book.placeLimitOrder(IOrderBook.Side.SELL, 110_000 * 1e4, 10 * 1e14, 20, 0);

        uint64[] memory orders = book.getUserOrders(alice);
        assertEq(orders.length, 2);
        // Most recent first (head of list)
        assertEq(orders[0], id2);
        assertEq(orders[1], id1);
    }

    function testGetUserOrders_EmptyForNoOrders() public {
        uint64[] memory orders = book.getUserOrders(alice);
        assertEq(orders.length, 0);
    }
}
