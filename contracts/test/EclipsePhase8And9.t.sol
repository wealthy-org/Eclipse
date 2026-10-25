// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {MockPonsToken} from "../src/MockPonsToken.sol";
import {MockStockToken} from "../src/MockStockToken.sol";
import {EclipseExecutorRoute} from "../src/EclipseExecutorRoute.sol";

contract EclipsePhase8And9Test is Test {
    MockPonsToken internal pons;
    MockStockToken internal nvda;
    EclipseExecutorRoute internal route;

    address internal matcher = address(0x1234);
    address internal alice = address(0xAAAA);

    function setUp() public {
        pons = new MockPonsToken();
        nvda = new MockStockToken();
        route = new EclipseExecutorRoute(matcher);
    }

    function test_tokensInitialSupplyAndMint() public {
        assertEq(pons.balanceOf(address(this)), 10_000_000 * 1e18);
        assertEq(nvda.balanceOf(address(this)), 1_000_000 * 1e18);

        pons.mint(alice, 500e18);
        nvda.mint(alice, 100e18);

        assertEq(pons.balanceOf(alice), 500e18);
        assertEq(nvda.balanceOf(alice), 100e18);
    }

    function test_executorRoute_preApproveAndValidate() public {
        uint256 waveId = 42;
        bytes32 root = keccak256("test-root-pons");
        uint256 amount = 1000e18;
        uint64 deadline = uint64(block.timestamp + 100);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(pons)),
            currency1: Currency.wrap(address(nvda)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        vm.prank(matcher);
        route.preApproveWave(waveId, root, amount, deadline);

        vm.prank(matcher);
        bool ok = route.validateExecutorRoute(waveId, key, root, amount);
        assertTrue(ok);

        // Cannot re-execute
        vm.prank(matcher);
        vm.expectRevert(abi.encodeWithSelector(EclipseExecutorRoute.WaveAlreadyExecuted.selector, waveId));
        route.validateExecutorRoute(waveId, key, root, amount);
    }

    function test_executorRoute_revertsOnMismatch() public {
        uint256 waveId = 101;
        bytes32 root = keccak256("root-nvda");
        uint256 amount = 500e18;
        uint64 deadline = uint64(block.timestamp + 100);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(nvda)),
            currency1: Currency.wrap(address(0x1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        vm.prank(matcher);
        route.preApproveWave(waveId, root, amount, deadline);

        // Wrong amount
        vm.prank(matcher);
        vm.expectRevert(abi.encodeWithSelector(EclipseExecutorRoute.ImbalanceMismatch.selector, amount, 499e18));
        route.validateExecutorRoute(waveId, key, root, 499e18);
    }
}
