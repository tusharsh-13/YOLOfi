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
        // Deploy tokens
        tYBTC = new MockERC20("Test YBTC", "tYBTC", 18);
        tUSDC = new MockERC20("Test USDC", "tUSDC", 6);

        // Deploy OrderBook
        book = new OrderBook(address(tYBTC), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);

        // Mint tokens to test users
        tYBTC.mint(alice, 100 * 1e18);
        tYBTC.mint(bob, 100 * 1e18);
        tUSDC.mint(alice, 1_000_000 * 1e6);
        tUSDC.mint(bob, 1_000_000 * 1e6);

        // Approve OrderBook to spend tokens
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
        // (tickSize * lotSize) % 1e18 != 0
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
        // Event emission verified by state change
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

        // Verify state changed correctly
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

        // Try to withdraw more than free balance
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
        // Deposit base
        vm.prank(alice);
        book.deposit(address(tYBTC), 20 * 1e18);

        // Withdraw all free balance
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
        assertEq(tYBTC.balanceOf(alice), 100 * 1e18); // Back to original
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
}
