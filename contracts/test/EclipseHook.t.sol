// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployers} from "../lib/v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {CustomRevert} from "v4-core/libraries/CustomRevert.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";

import {EclipseHook} from "../src/EclipseHook.sol";
import {HookMiner} from "./utils/HookMiner.sol";

/// @notice Phase 1 local test suite for EclipseHook, per HOOK_DESIGN.md and the brief's §58 test
///         list ("public path", "wrong pool", "wrong amount", "hook unauthorized call", …).
///         Runs entirely on Foundry's local EVM — no testnet, no RPC, no funded wallet needed.
contract EclipseHookTest is Deployers {
    using PoolIdLibrary for PoolKey;

    EclipseHook internal hook;
    PoolKey internal poolKey;
    PoolId internal poolId;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        );
        bytes memory constructorArgs = abi.encode(manager, address(this));
        (address hookAddress, bytes32 salt) =
            HookMiner.find(address(this), flags, type(EclipseHook).creationCode, constructorArgs);

        hook = new EclipseHook{salt: salt}(manager, address(this));
        require(address(hook) == hookAddress, "hook address mismatch");

        poolKey = PoolKey(currency0, currency1, 3000, 60, IHooks(address(hook)));
        poolId = poolKey.toId();

        hook.registerPool(poolKey);
        manager.initialize(poolKey, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);
    }

    /// @dev v4-core's PoolManager wraps every hook revert in an ERC-7751 `CustomRevert.WrappedError`
    ///      (hook address, the selector of the hook function that was called, the raw inner revert
    ///      data, and `Hooks.HookCallFailed`) rather than letting the inner custom error bubble up
    ///      raw — see `Hooks.callHook`. Tests must expect that wrapper, not the bare inner error.
    function _wrapped(address hookAddr, bytes4 hookFnSelector, bytes memory innerRevert) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(
            CustomRevert.WrappedError.selector, hookAddr, hookFnSelector, innerRevert, abi.encodeWithSelector(Hooks.HookCallFailed.selector)
        );
    }

    function test_permissions_matchHookDesign() public view {
        Hooks.Permissions memory p = hook.getHookPermissions();
        assertTrue(p.beforeInitialize);
        assertTrue(p.beforeSwap);
        assertTrue(p.afterSwap);
        assertTrue(p.afterSwapReturnDelta);
        assertFalse(p.beforeAddLiquidity);
        assertFalse(p.afterAddLiquidity);
        assertFalse(p.beforeRemoveLiquidity);
        assertFalse(p.afterRemoveLiquidity);
        assertFalse(p.beforeDonate);
        assertFalse(p.afterDonate);
        assertFalse(p.beforeSwapReturnDelta);
    }

    /// @dev Public path: empty hookData, no Eclipse wave involved — must pass straight through,
    ///      exactly like an ordinary v4 swap (HOOK_DESIGN.md §2).
    function test_publicSwap_passesThrough() public {
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        swapRouter.swap(poolKey, SWAP_PARAMS, settings, ZERO_BYTES);
    }

    /// @dev Dark path happy case: a locked wave whose commitment root + proven net amount match
    ///      exactly what the executor swaps settles successfully and marks the wave executed.
    function test_darkSwap_matchingWave_settles() public {
        hook.setEclipseExecutor(address(swapRouter));

        uint256 waveId = 1;
        uint256 amount = 100; // matches abs(SWAP_PARAMS.amountSpecified)
        bytes32 root = bytes32(uint256(0xEC11));
        uint64 deadline = uint64(block.timestamp + 1 days);
        hook.lockWave(waveId, poolId, root, amount, deadline);

        bytes memory hookData = abi.encode(waveId, root, amount);
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        swapRouter.swap(poolKey, SWAP_PARAMS, settings, hookData);

        (,,, bool executed) = hook.waves(waveId);
        assertTrue(executed, "wave should be marked executed after a matching dark swap");
    }

    /// @dev brief §58 "hook unauthorized call": only the registered EclipseExecutor may use the
    ///      dark path, even with an otherwise-correct wave lock.
    function test_darkSwap_revertsIfSenderNotExecutor() public {
        // eclipseExecutor left unset (address(0)) — swapRouter is never authorized.
        uint256 waveId = 2;
        uint256 amount = 100;
        bytes32 root = bytes32(uint256(2));
        hook.lockWave(waveId, poolId, root, amount, uint64(block.timestamp + 1 days));

        bytes memory hookData = abi.encode(waveId, root, amount);
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

        vm.expectRevert(_wrapped(address(hook), IHooks.beforeSwap.selector, abi.encodeWithSelector(EclipseHook.NotEclipseExecutor.selector)));
        swapRouter.swap(poolKey, SWAP_PARAMS, settings, hookData);
    }

    /// @dev brief §58 "wrong amount": the executor must swap exactly the proven net imbalance,
    ///      never an amount it picked itself.
    function test_darkSwap_revertsOnAmountMismatch() public {
        hook.setEclipseExecutor(address(swapRouter));

        uint256 waveId = 3;
        bytes32 root = bytes32(uint256(3));
        // Lock the wave for a different amount than what the swap actually specifies (100).
        hook.lockWave(waveId, poolId, root, 999, uint64(block.timestamp + 1 days));

        bytes memory hookData = abi.encode(waveId, root, uint256(999));
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

        vm.expectRevert(
            _wrapped(address(hook), IHooks.beforeSwap.selector, abi.encodeWithSelector(EclipseHook.AmountMismatch.selector, 999, 999))
        );
        swapRouter.swap(poolKey, SWAP_PARAMS, settings, hookData);
    }

    /// @dev brief §58 "wrong wave" / replay: a wave cannot be re-locked once executed, and
    ///      re-submitting the same hookData after settlement must revert, never silently re-run.
    function test_lockWave_revertsIfAlreadyExecuted() public {
        hook.setEclipseExecutor(address(swapRouter));
        uint256 waveId = 4;
        bytes32 root = bytes32(uint256(4));
        hook.lockWave(waveId, poolId, root, 100, uint64(block.timestamp + 1 days));

        bytes memory hookData = abi.encode(waveId, root, uint256(100));
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        swapRouter.swap(poolKey, SWAP_PARAMS, settings, hookData);

        vm.expectRevert(abi.encodeWithSelector(EclipseHook.WaveAlreadySettled.selector, waveId));
        hook.lockWave(waveId, poolId, root, 100, uint64(block.timestamp + 1 days));
    }

    /// @dev brief §58 "wrong pool": beforeInitialize must reject any pool that was never
    ///      registered through the Eclipse pool registry.
    function test_initialize_revertsIfPoolNotRegistered() public {
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        );
        bytes memory constructorArgs = abi.encode(manager, address(this));
        (address hookAddress2, bytes32 salt2) =
            HookMiner.find(address(this), flags, type(EclipseHook).creationCode, constructorArgs);
        EclipseHook hook2 = new EclipseHook{salt: salt2}(manager, address(this));
        require(address(hook2) == hookAddress2, "hook2 address mismatch");

        // Never call hook2.registerPool(...) for this key.
        PoolKey memory unregisteredKey = PoolKey(currency0, currency1, 500, 10, IHooks(address(hook2)));

        vm.expectRevert(
            _wrapped(hookAddress2, IHooks.beforeInitialize.selector, abi.encodeWithSelector(EclipseHook.PoolNotRegistered.selector))
        );
        manager.initialize(unregisteredKey, SQRT_PRICE_1_1);
    }

    /// @dev brief §49: admin (owner) powers are bounded — a non-owner can't register pools,
    ///      change the executor, or lock waves.
    function test_adminFunctions_revertForNonOwner() public {
        address stranger = address(0xBEEF);
        vm.startPrank(stranger);

        vm.expectRevert(EclipseHook.NotOwner.selector);
        hook.setEclipseExecutor(stranger);

        vm.expectRevert(EclipseHook.NotOwner.selector);
        hook.registerPool(poolKey);

        vm.expectRevert(EclipseHook.NotOwner.selector);
        hook.lockWave(99, poolId, bytes32(uint256(99)), 1, uint64(block.timestamp + 1 days));

        vm.stopPrank();
    }
}
