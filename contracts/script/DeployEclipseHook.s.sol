// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

import {EclipseHook} from "../src/EclipseHook.sol";
import {HookMiner} from "../test/utils/HookMiner.sol";

/// @notice Deploys EclipseHook to the configured network via the canonical CREATE2 deployer
///         proxy, mining a salt so the deployed address carries exactly the four permission
///         bits decided in HOOK_DESIGN.md §2 — nothing more.
///
/// Usage (testnet, e.g. Unichain Sepolia per ROBINHOOD_POOL_MATRIX.md):
///   forge script script/DeployEclipseHook.s.sol \
///     --rpc-url $UNICHAIN_SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvvv
contract DeployEclipseHook is Script {
    // Canonical CREATE2 deployer proxy (Nick's method — same address on every chain it's been
    // deployed to, including Unichain Sepolia; verified via eth_getCode before writing this).
    // Deploying through it, rather than a plain `new X{salt}()` from this ephemeral script
    // contract, is required for the mined address to be reproducible — Foundry explicitly
    // forbids `address(this)` in script contracts for exactly this reason.
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external returns (EclipseHook hook) {
        address poolManagerAddr = vm.envAddress("POOL_MANAGER_ADDRESS");
        address owner = vm.envAddress("DEPLOYER_ADDRESS");

        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        );

        bytes memory creationCode = type(EclipseHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManagerAddr), owner);
        (address hookAddress, bytes32 salt) = HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, constructorArgs);

        console2.log("Mined EclipseHook address:", hookAddress);
        console2.log("Salt:", vm.toString(salt));

        vm.startBroadcast();
        (bool success,) = CREATE2_DEPLOYER.call(abi.encodePacked(salt, creationCode, constructorArgs));
        require(success, "CREATE2 deployer call failed");
        vm.stopBroadcast();

        require(hookAddress.code.length > 0, "no code at mined address after deploy");
        hook = EclipseHook(hookAddress);
        console2.log("EclipseHook deployed at:", address(hook));
    }
}
