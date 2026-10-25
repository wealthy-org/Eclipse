// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";

import {EclipseHook} from "../src/EclipseHook.sol";

/// @notice Phase 1 "Launch Proof" (brief §64): on the already-deployed EclipseHook, register a
///         real WETH/USDG-style pool, add liquidity, lock one Eclipse Wave, and execute one real
///         dark-path swap against it — end to end, on Robinhood Chain testnet.
///
/// PoolSwapTest / PoolModifyLiquidityTest (from v4-core's own test suite) stand in for the real
/// EclipseExecutor contract for this proof. They are the right tool for "prove the hook's checks
/// actually gate a real PoolManager.swap() on a live chain" — the real EclipseExecutor (brief
/// §5.4) is Phase 3 scope, not re-derived here.
contract ProveLiveLoop is Script {
    using PoolIdLibrary for PoolKey;

    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        address hookAddr = vm.envAddress("ECLIPSE_HOOK_ADDRESS");
        address poolManagerAddr = vm.envAddress("POOL_MANAGER_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        EclipseHook hook = EclipseHook(hookAddr);
        IPoolManager manager = IPoolManager(poolManagerAddr);

        vm.startBroadcast();

        // 1. Two mock tokens standing in for WETH / USDG on this testnet.
        MockERC20 tokenA = new MockERC20("Eclipse Mock WETH", "mWETH", 18);
        MockERC20 tokenB = new MockERC20("Eclipse Mock USDG", "mUSDG", 18);
        tokenA.mint(deployer, 1_000e18);
        tokenB.mint(deployer, 1_000_000e18);

        (Currency currency0, Currency currency1) = address(tokenA) < address(tokenB)
            ? (Currency.wrap(address(tokenA)), Currency.wrap(address(tokenB)))
            : (Currency.wrap(address(tokenB)), Currency.wrap(address(tokenA)));

        // 2. Routers standing in for the real EclipseExecutor / a liquidity-provisioning flow.
        PoolSwapTest swapRouter = new PoolSwapTest(manager);
        PoolModifyLiquidityTest modifyLiquidityRouter = new PoolModifyLiquidityTest(manager);

        tokenA.approve(address(swapRouter), type(uint256).max);
        tokenB.approve(address(swapRouter), type(uint256).max);
        tokenA.approve(address(modifyLiquidityRouter), type(uint256).max);
        tokenB.approve(address(modifyLiquidityRouter), type(uint256).max);

        // 3. Register + initialize the pool through EclipseHook.
        PoolKey memory key = PoolKey(currency0, currency1, FEE, TICK_SPACING, IHooks(hookAddr));
        PoolId poolId = key.toId();
        hook.registerPool(key);
        manager.initialize(key, SQRT_PRICE_1_1);
        console2.log("Pool initialized. PoolId:");
        console2.logBytes32(PoolId.unwrap(poolId));

        // 4. Add liquidity so the dark-path swap below has something to trade against.
        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: 1e15, salt: 0}),
            ""
        );
        console2.log("Liquidity added.");

        // 5. Authorize this proof's swap router as the Eclipse Executor, lock one Eclipse Wave.
        hook.setEclipseExecutor(address(swapRouter));

        uint256 waveId = 1;
        int256 amountSpecified = -1e14; // exact-input, 0.0001 of the in-token
        uint256 amount = uint256(-amountSpecified);
        bytes32 root = keccak256("eclipse-launch-proof-wave-1");
        uint64 deadline = uint64(block.timestamp + 1 hours);
        hook.lockWave(waveId, poolId, root, amount, deadline);
        console2.log("Eclipse Wave #1 locked. Expected amount:", amount);

        // 6. Execute the dark-path swap. beforeSwap/afterSwap must accept it (matching wave,
        //    matching amount, authorized executor) and afterSwap must mark it executed.
        bytes memory hookData = abi.encode(waveId, root, amount);
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        swapRouter.swap(
            key,
            IPoolManager.SwapParams({zeroForOne: true, amountSpecified: amountSpecified, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            settings,
            hookData
        );

        vm.stopBroadcast();

        (,,, bool executed) = hook.waves(waveId);
        console2.log("Eclipse Wave #1 executed:", executed);
        require(executed, "launch proof failed: wave not marked executed");

        console2.log("--- Launch proof complete ---");
        console2.log("mWETH:", address(tokenA));
        console2.log("mUSDG:", address(tokenB));
        console2.log("swapRouter (stand-in EclipseExecutor):", address(swapRouter));
        console2.log("modifyLiquidityRouter:", address(modifyLiquidityRouter));
    }
}
