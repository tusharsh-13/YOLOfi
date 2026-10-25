// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/OrderBook.sol";
import "../src/MockERC20.sol";
import "../src/interfaces/IOrderBook.sol";

/// @title Deploy
/// @notice Deployment script for YOLOfi contracts
contract Deploy is Script {
    // Configuration
    uint256 constant TICK_SIZE = 1e4;
    uint256 constant LOT_SIZE = 1e14;
    uint256 constant MIN_ORDER_SIZE = 1e14;
    uint256 constant TAKER_FEE_BPS = 10;

    function run() external {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock tokens
        MockERC20 tYBTC = new MockERC20("Test YBTC", "tYBTC", 18);
        MockERC20 tUSDC = new MockERC20("Test USDC", "tUSDC", 6);

        console.log("tYBTC deployed at:", address(tYBTC));
        console.log("tUSDC deployed at:", address(tUSDC));

        // Deploy OrderBook
        OrderBook book =
            new OrderBook(address(tYBTC), address(tUSDC), TICK_SIZE, LOT_SIZE, MIN_ORDER_SIZE, TAKER_FEE_BPS);

        console.log("OrderBook deployed at:", address(book));

        // Mint initial supply to deployer for seeding
        tYBTC.mint(deployer, 1000 * 1e18);
        tUSDC.mint(deployer, 10_000_000 * 1e6);

        // Approve OrderBook
        tYBTC.approve(address(book), type(uint256).max);
        tUSDC.approve(address(book), type(uint256).max);

        // Deposit for deployer (alice)
        book.deposit(address(tYBTC), 500 * 1e18);
        book.deposit(address(tUSDC), 5_000_000 * 1e6);

        // Place some demo orders
        // Sell orders (asks)
        book.placeLimitOrder(IOrderBook.Side.SELL, 105_000 * 1e4, 50 * 1e14, 20, 0);
        book.placeLimitOrder(IOrderBook.Side.SELL, 106_000 * 1e4, 30 * 1e14, 20, 0);
        book.placeLimitOrder(IOrderBook.Side.SELL, 107_000 * 1e4, 20 * 1e14, 20, 0);

        // Buy orders (bids)
        book.placeLimitOrder(IOrderBook.Side.BUY, 95_000 * 1e4, 40 * 1e14, 20, 0);
        book.placeLimitOrder(IOrderBook.Side.BUY, 94_000 * 1e4, 30 * 1e14, 20, 0);
        book.placeLimitOrder(IOrderBook.Side.BUY, 93_000 * 1e4, 20 * 1e14, 20, 0);

        console.log("Demo orders placed");

        vm.stopBroadcast();
    }
}
