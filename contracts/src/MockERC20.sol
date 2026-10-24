// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Simple ERC20 with public mint for testing/faucet use.
/// Mint is capped per call to prevent abuse.
contract MockERC20 is ERC20 {
    uint256 public constant MINT_CAP = 10_000 * 10 ** 18; // 10k whole tokens per call

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals_);
    }

    /// @notice Mint tokens to an address (capped per call)
    /// @param to Recipient
    /// @param amount Amount in smallest units (capped at MINT_CAP)
    function mint(address to, uint256 amount) external {
        if (amount > MINT_CAP) {
            amount = MINT_CAP;
        }
        _mint(to, amount);
    }

    /// @notice Convenience faucet: mint MINT_CAP to caller
    function faucet() external {
        _mint(msg.sender, MINT_CAP);
    }
}
