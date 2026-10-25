// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

/// @title MockPonsToken
/// @notice Mock representation of a graduated Pons bonding curve token on Robinhood Chain Testnet
contract MockPonsToken is ERC20 {
    address public immutable owner;

    constructor() ERC20("Pons Graduated Token", "PONS", 18) {
        owner = msg.sender;
        _mint(msg.sender, 10_000_000 * 1e18); // 10 million initial supply
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        _mint(to, amount);
    }
}
