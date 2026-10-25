// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

/// @title MockStockToken
/// @notice Mock representation of a securities-linked Stock Token (e.g. NVDA) on Robinhood Chain Testnet (Phase 9)
contract MockStockToken is ERC20 {
    address public immutable owner;

    constructor() ERC20("NVIDIA Corporation Token", "NVDA", 18) {
        owner = msg.sender;
        _mint(msg.sender, 1_000_000 * 1e18); // 1 million NVDA tokens
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        _mint(to, amount);
    }
}
