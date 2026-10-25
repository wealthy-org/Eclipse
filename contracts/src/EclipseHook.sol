// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

/// @title EclipseHook
/// @notice Phase 1 (transparent batch prototype) enforcement gateway between private/batched
///         order flow and public Uniswap v4 liquidity. See
///         /25/Eclipse/docs/phase0/HOOK_DESIGN.md for the design rationale this contract
///         implements verbatim.
///
/// @dev Illustrative, unaudited, Phase 1 code. Not deployed to any mainnet. Permission bits
///      enabled (mined into this contract's deployment address via CREATE2):
///      beforeInitialize | beforeSwap | afterSwap | afterSwapReturnDelta.
///
///      v4-periphery no longer ships a `BaseHook` base contract at the pinned version this repo
///      installs, so this contract implements `IHooks` directly — every callback this hook does
///      not use is a cheap pass-through stub, never reachable in practice because the disabled
///      permission bits mean `PoolManager` never calls them, but they must exist to satisfy the
///      interface.
contract EclipseHook is IHooks {
    using PoolIdLibrary for PoolKey;
    using BalanceDeltaLibrary for BalanceDelta;

    // ---------------------------------------------------------------------
    // Errors — mirrors the six beforeSwap checks in HOOK_DESIGN.md §3
    // ---------------------------------------------------------------------
    error NotPoolManager();
    error NotOwner();
    error NotEclipseExecutor();
    error PoolNotRegistered();
    error WaveAlreadySettled(uint256 waveId);
    error RootMismatch();
    error AmountMismatch(uint256 expected, uint256 got);
    error DeadlineExpired();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event PoolRegistered(PoolId indexed poolId);
    event WaveLocked(uint256 indexed waveId, PoolId indexed poolId, bytes32 commitmentRoot, uint256 expectedAmount, uint64 deadline);
    event EclipseWaveExecuted(uint256 indexed waveId, PoolId indexed poolId, int128 unspecifiedDelta, bytes32 commitmentRoot);

    // ---------------------------------------------------------------------
    // Admin state — brief §49: V1 is a single protocol-operated matcher/admin.
    // Production deployment replaces `owner` with a 2-of-3 multisig per the brief;
    // this scaffold keeps a single EOA owner for local/testnet iteration speed.
    // ---------------------------------------------------------------------
    IPoolManager public immutable poolManager;
    address public owner;
    address public eclipseExecutor;

    /// @dev Eclipse protocol fee, in hundredths of a bip (1 = 0.0001%). 50 == 5 bps per brief §28.
    uint24 public constant FEE_PIPS = 50;
    uint24 private constant PIPS_DENOMINATOR = 1_000_000;

    mapping(PoolId => bool) public registeredPools;

    struct Wave {
        bytes32 commitmentRoot;
        uint256 expectedAmount; // proven net imbalance, in the swap's specified-currency units
        uint64 deadline;
        bool executed;
    }

    mapping(uint256 => Wave) public waves;

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IPoolManager _poolManager, address _owner) {
        poolManager = _poolManager;
        owner = _owner;
        // Fails fast at deploy time if the CREATE2-mined address doesn't carry exactly the
        // intended permission bits — the on-chain equivalent of HOOK_DESIGN.md §1's warning not
        // to hand-copy a bit table from a blog post.
        Hooks.validateHookPermissions(this, getHookPermissions());
    }

    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ---------------------------------------------------------------------
    // Admin — brief §49: admin can register pools / set the executor, never move user funds.
    // ---------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setEclipseExecutor(address executor) external onlyOwner {
        eclipseExecutor = executor;
    }

    /// @notice Register a pool for the Eclipse dark path. Called before `PoolManager.initialize`
    ///         for that pool — `beforeInitialize` rejects any pool that skipped this step.
    function registerPool(PoolKey calldata key) external onlyOwner {
        PoolId id = key.toId();
        registeredPools[id] = true;
        emit PoolRegistered(id);
    }

    /// @notice Lock a Dark/Eclipse Wave's proven net imbalance on-chain so `beforeSwap` can
    ///         verify the executor's swap matches it exactly. V1: called by the single
    ///         protocol-operated matcher (this `owner`), per brief §30.
    function lockWave(uint256 waveId, PoolId poolId, bytes32 commitmentRoot, uint256 expectedAmount, uint64 deadline)
        external
        onlyOwner
    {
        if (waves[waveId].executed) revert WaveAlreadySettled(waveId);
        waves[waveId] = Wave({commitmentRoot: commitmentRoot, expectedAmount: expectedAmount, deadline: deadline, executed: false});
        emit WaveLocked(waveId, poolId, commitmentRoot, expectedAmount, deadline);
    }

    // ---------------------------------------------------------------------
    // IHooks — swap path (HOOK_DESIGN.md §3, §4)
    // ---------------------------------------------------------------------

    function beforeInitialize(address, PoolKey calldata key, uint160) external view onlyPoolManager returns (bytes4) {
        if (!registeredPools[key.toId()]) revert PoolNotRegistered();
        return IHooks.beforeInitialize.selector;
    }

    /// @dev `hookData` is empty on the public path (plain v4 swap, no Eclipse involvement — must
    ///      return near-instantly per HOOK_DESIGN.md §2). On the dark path it is
    ///      `abi.encode(waveId, commitmentRoot, amount)`, where `amount` is the absolute value of
    ///      `params.amountSpecified` the executor is about to swap.
    function beforeSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata params, bytes calldata hookData)
        external
        view
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (hookData.length == 0) {
            return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        if (sender != eclipseExecutor) revert NotEclipseExecutor();

        PoolId poolId = key.toId();
        if (!registeredPools[poolId]) revert PoolNotRegistered();

        (uint256 waveId, bytes32 root, uint256 amount) = abi.decode(hookData, (uint256, bytes32, uint256));
        Wave storage w = waves[waveId];

        if (w.executed) revert WaveAlreadySettled(waveId);
        if (w.commitmentRoot != root) revert RootMismatch();

        uint256 got = params.amountSpecified < 0 ? uint256(-params.amountSpecified) : uint256(params.amountSpecified);
        if (got != amount || amount != w.expectedAmount) revert AmountMismatch(w.expectedAmount, amount);

        if (block.timestamp > w.deadline) revert DeadlineExpired();

        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @dev Mirrors the `beforeSwap` gate exactly: empty `hookData` is the public path and pays
    ///      zero extra gas for Eclipse logic. The fee is taken from the swap's unspecified-token
    ///      delta via `afterSwapReturnDelta`, so no separate transfer call is needed.
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4, int128) {
        if (hookData.length == 0) {
            return (IHooks.afterSwap.selector, 0);
        }

        (uint256 waveId, bytes32 root,) = abi.decode(hookData, (uint256, bytes32, uint256));
        Wave storage w = waves[waveId];
        w.executed = true;

        // The "unspecified" currency is whichever side the swapper did NOT fix an exact amount
        // on — currency1 for a zeroForOne swap, currency0 otherwise. afterSwapReturnDelta only
        // ever adjusts this side (v4-core's Hooks.afterSwap enforces that).
        bool unspecifiedIsCurrency1 = params.zeroForOne;
        int128 unspecified = unspecifiedIsCurrency1 ? delta.amount1() : delta.amount0();

        int128 fee = int128((int256(unspecified) * int256(uint256(FEE_PIPS))) / int256(uint256(PIPS_DENOMINATOR)));
        if (fee < 0) fee = -fee;

        // Returning `fee` via afterSwapReturnDelta tells PoolManager the hook is owed `fee` of
        // the unspecified currency — but that claim is only a bookkeeping delta, not tokens.
        // The hook must actually redeem it with `take()` inside this same unlocked call, or
        // PoolManager's final settlement check reverts with `CurrencyNotSettled()`.
        if (fee > 0) {
            Currency feeCurrency = unspecifiedIsCurrency1 ? key.currency1 : key.currency0;
            poolManager.take(feeCurrency, address(this), uint256(uint128(fee)));
        }

        emit EclipseWaveExecuted(waveId, key.toId(), unspecified, root);
        return (IHooks.afterSwap.selector, fee);
    }

    // ---------------------------------------------------------------------
    // IHooks — unused callbacks. Disabled in getHookPermissions(), so PoolManager never routes
    // here; kept as plain selector-returning stubs only to satisfy the IHooks interface.
    // ---------------------------------------------------------------------

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IHooks.afterDonate.selector;
    }
}
