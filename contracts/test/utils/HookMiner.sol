// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Local copy of the de-facto standard HookMiner (from Uniswap/v4-periphery's test/shared), wired
// to this repo's own v4-core install instead of the nested copy inside v4-periphery's lib/, so it
// shares types with EclipseHook. See HOOK_DESIGN.md §1 — CREATE2 salt mining is how a v4 hook's
// permission bits end up in its deployed address.
import {Hooks} from "v4-core/libraries/Hooks.sol";

library HookMiner {
    uint160 constant FLAG_MASK = Hooks.ALL_HOOK_MASK;
    uint256 constant MAX_LOOP = 160_444;

    function find(address deployer, uint160 flags, bytes memory creationCode, bytes memory constructorArgs)
        internal
        view
        returns (address, bytes32)
    {
        flags = flags & FLAG_MASK;
        bytes memory creationCodeWithArgs = abi.encodePacked(creationCode, constructorArgs);

        address hookAddress;
        for (uint256 salt; salt < MAX_LOOP; salt++) {
            hookAddress = computeAddress(deployer, salt, creationCodeWithArgs);
            if (uint160(hookAddress) & FLAG_MASK == flags && hookAddress.code.length == 0) {
                return (hookAddress, bytes32(salt));
            }
        }
        revert("HookMiner: could not find salt");
    }

    function computeAddress(address deployer, uint256 salt, bytes memory creationCodeWithArgs)
        internal
        pure
        returns (address hookAddress)
    {
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xFF), deployer, salt, keccak256(creationCodeWithArgs)))))
        );
    }
}
