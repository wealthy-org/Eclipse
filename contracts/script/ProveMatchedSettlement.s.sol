// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {EclipseOrderRegistry} from "../src/EclipseOrderRegistry.sol";

/// @notice Proves EclipseOrderRegistry.settleMatchedPair settles two real, opposite-direction
/// orders against each other's escrow on live Robinhood Chain testnet — the piece the matcher
/// needs once it's reading real order books instead of this script's two hardcoded orders.
contract ProveMatchedSettlement is Script {
    function run() external {
        address registryAddr = vm.envAddress("ECLIPSE_ORDER_REGISTRY_ADDRESS");
        address owner = vm.envAddress("DEPLOYER_ADDRESS");
        EclipseOrderRegistry registry = EclipseOrderRegistry(registryAddr);

        vm.startBroadcast();

        MockERC20 tokenA = new MockERC20("Eclipse Mock WETH", "mWETH", 18);
        MockERC20 tokenB = new MockERC20("Eclipse Mock USDG", "mUSDG", 18);
        tokenA.mint(owner, 10e18);
        tokenB.mint(owner, 10_000e18);
        tokenA.approve(registryAddr, type(uint256).max);
        tokenB.approve(registryAddr, type(uint256).max);

        PoolId poolId = PoolId.wrap(bytes32(uint256(1)));

        // Order A: sell 1 WETH, want >= 3000 USDG.
        uint256 orderA =
            registry.submitOrder(poolId, address(tokenA), address(tokenB), 1e18, 3000e18, uint64(block.timestamp + 1 hours));
        // Order B: sell 3000 USDG, want >= 1 WETH — exact opposite, should fully match.
        uint256 orderB =
            registry.submitOrder(poolId, address(tokenB), address(tokenA), 3000e18, 1e18, uint64(block.timestamp + 1 hours));

        console2.log("Order A id:", orderA);
        console2.log("Order B id:", orderB);

        registry.settleMatchedPair(orderA, orderB, 1e18, 3000e18);

        vm.stopBroadcast();

        (,,,,,,,,, EclipseOrderRegistry.OrderStatus statusA) = registry.orders(orderA);
        (,,,,,,,,, EclipseOrderRegistry.OrderStatus statusB) = registry.orders(orderB);
        console2.log("Order A status (3=Settled):", uint8(statusA));
        console2.log("Order B status (3=Settled):", uint8(statusB));
        require(statusA == EclipseOrderRegistry.OrderStatus.Settled, "order A not settled");
        require(statusB == EclipseOrderRegistry.OrderStatus.Settled, "order B not settled");
        console2.log("--- Matched settlement proof complete ---");
    }
}
