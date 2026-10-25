// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {PoolId} from "v4-core/types/PoolId.sol";

import {EclipseOrderRegistry} from "../src/EclipseOrderRegistry.sol";

contract EclipseOrderRegistryTest is Test {
    EclipseOrderRegistry internal registry;
    MockERC20 internal tokenIn;
    MockERC20 internal tokenOut;
    address internal matcher = address(this);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        registry = new EclipseOrderRegistry(matcher);
        tokenIn = new MockERC20("mWETH", "mWETH", 18);
        tokenOut = new MockERC20("mUSDG", "mUSDG", 18);

        tokenIn.mint(alice, 10e18);
        vm.prank(alice);
        tokenIn.approve(address(registry), type(uint256).max);

        tokenOut.mint(bob, 10_000e18);
        vm.prank(bob);
        tokenOut.approve(address(registry), type(uint256).max);
    }

    function test_submitOrder_escrowsFunds() public {
        vm.prank(alice);
        uint256 orderId = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );

        assertEq(tokenIn.balanceOf(address(registry)), 1e18);
        assertEq(tokenIn.balanceOf(alice), 9e18);

        (
            address owner,
            ,
            address tIn,
            address tOut,
            uint256 amountIn,
            uint256 minAmountOut,
            ,
            ,
            ,
            EclipseOrderRegistry.OrderStatus status
        ) = registry.orders(orderId);
        assertEq(owner, alice);
        assertEq(tIn, address(tokenIn));
        assertEq(tOut, address(tokenOut));
        assertEq(amountIn, 1e18);
        assertEq(minAmountOut, 3000e18);
        assertEq(uint8(status), uint8(EclipseOrderRegistry.OrderStatus.Open));
    }

    function test_cancelOrder_refunds() public {
        vm.prank(alice);
        uint256 orderId = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );

        vm.prank(alice);
        registry.cancelOrder(orderId);

        assertEq(tokenIn.balanceOf(alice), 10e18);
        (,,,,,,,,, EclipseOrderRegistry.OrderStatus status) = registry.orders(orderId);
        assertEq(uint8(status), uint8(EclipseOrderRegistry.OrderStatus.Cancelled));
    }

    function test_cancelOrder_revertsForNonOwner() public {
        vm.prank(alice);
        uint256 orderId = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );

        vm.expectRevert(EclipseOrderRegistry.NotOrderOwner.selector);
        registry.cancelOrder(orderId);
    }

    function test_cancelOrder_revertsOnceLocked() public {
        vm.prank(alice);
        uint256 orderId = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );

        registry.setOrderStatus(orderId, EclipseOrderRegistry.OrderStatus.Locked);

        vm.prank(alice);
        vm.expectRevert(EclipseOrderRegistry.OrderNotOpen.selector);
        registry.cancelOrder(orderId);
    }

    function test_settleOrderPayout_paysOwner() public {
        vm.prank(alice);
        uint256 orderId = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );
        registry.setOrderStatus(orderId, EclipseOrderRegistry.OrderStatus.Locked);

        tokenOut.mint(matcher, 3100e18);
        tokenOut.approve(address(registry), 3100e18); // not required by contract, but mirrors a real flow
        tokenOut.transfer(address(registry), 3100e18);

        registry.settleOrderPayout(orderId, address(tokenOut), 3100e18);

        assertEq(tokenOut.balanceOf(alice), 3100e18);
        (,,,,,,,,, EclipseOrderRegistry.OrderStatus status) = registry.orders(orderId);
        assertEq(uint8(status), uint8(EclipseOrderRegistry.OrderStatus.Settled));
    }

    function test_submitOrder_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(EclipseOrderRegistry.ZeroAmount.selector);
        registry.submitOrder(PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 0, 0, uint64(block.timestamp + 1 hours));
    }

    function test_submitOrder_revertsOnExpiredDeadline() public {
        vm.prank(alice);
        vm.expectRevert(EclipseOrderRegistry.OrderExpired.selector);
        registry.submitOrder(PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 0, uint64(block.timestamp));
    }

    function test_currentWaveId_advancesEveryThirtySeconds() public {
        assertEq(registry.currentWaveId(), 0);
        vm.warp(block.timestamp + 31);
        assertEq(registry.currentWaveId(), 1);
    }

    /// Alice sells 1 tokenIn wanting >= 3000 tokenOut; Bob buys with 3000 tokenOut wanting >= 1
    /// tokenIn. Exact opposite sizes — should fully settle both in one call.
    function test_settleMatchedPair_fullMatch() public {
        vm.prank(alice);
        uint256 aliceOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );
        vm.prank(bob);
        uint256 bobOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenOut), address(tokenIn), 3000e18, 1e18, uint64(block.timestamp + 1 hours)
        );

        registry.settleMatchedPair(aliceOrder, bobOrder, 1e18, 3000e18);

        assertEq(tokenOut.balanceOf(alice), 3000e18);
        assertEq(tokenIn.balanceOf(bob), 1e18);
        assertEq(tokenIn.balanceOf(address(registry)), 0);
        assertEq(tokenOut.balanceOf(address(registry)), 0);

        (,,,,,,,,, EclipseOrderRegistry.OrderStatus aStatus) = registry.orders(aliceOrder);
        (,,,,,,,,, EclipseOrderRegistry.OrderStatus bStatus) = registry.orders(bobOrder);
        assertEq(uint8(aStatus), uint8(EclipseOrderRegistry.OrderStatus.Settled));
        assertEq(uint8(bStatus), uint8(EclipseOrderRegistry.OrderStatus.Settled));
    }

    /// Alice's full 1e18 is matched, but Bob only had 2000 of his 3000 tokenOut matched this
    /// round — Alice settles, Bob stays Locked with remaining escrow for a later round.
    function test_settleMatchedPair_partialFillLeavesOrderLocked() public {
        vm.prank(alice);
        uint256 aliceOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 2000e18, uint64(block.timestamp + 1 hours)
        );
        vm.prank(bob);
        uint256 bobOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenOut), address(tokenIn), 3000e18, 1e18, uint64(block.timestamp + 1 hours)
        );

        // Alice's full amount (1e18) matched against 2000 of Bob's 3000 tokenOut.
        registry.settleMatchedPair(aliceOrder, bobOrder, 1e18, 2000e18);

        (,,,,,,,,, EclipseOrderRegistry.OrderStatus aStatus) = registry.orders(aliceOrder);
        (,,,, uint256 bAmountIn,, uint256 bFilled,,, EclipseOrderRegistry.OrderStatus bStatus) = registry.orders(bobOrder);
        assertEq(uint8(aStatus), uint8(EclipseOrderRegistry.OrderStatus.Settled));
        assertEq(uint8(bStatus), uint8(EclipseOrderRegistry.OrderStatus.Locked));
        assertEq(bAmountIn - bFilled, 1000e18);
    }

    /// Bob offers Alice less tokenOut than her pro-rated minAmountOut — must revert, never
    /// silently short-fill (brief §17).
    function test_settleMatchedPair_revertsOnSlippageViolation() public {
        vm.prank(alice);
        uint256 aliceOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 3000e18, uint64(block.timestamp + 1 hours)
        );
        vm.prank(bob);
        uint256 bobOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenOut), address(tokenIn), 2000e18, 1e18, uint64(block.timestamp + 1 hours)
        );

        vm.expectRevert(abi.encodeWithSelector(EclipseOrderRegistry.SlippageViolated.selector, aliceOrder, 3000e18, 2000e18));
        registry.settleMatchedPair(aliceOrder, bobOrder, 1e18, 2000e18);
    }

    function test_settleMatchedPair_revertsOnTokenMismatch() public {
        MockERC20 other = new MockERC20("mX", "mX", 18);
        other.mint(bob, 10e18);
        vm.prank(bob);
        other.approve(address(registry), type(uint256).max);

        vm.prank(alice);
        uint256 aliceOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 1, uint64(block.timestamp + 1 hours)
        );
        vm.prank(bob);
        uint256 bobOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(other), address(tokenIn), 1e18, 1, uint64(block.timestamp + 1 hours)
        );

        vm.expectRevert(EclipseOrderRegistry.TokenMismatch.selector);
        registry.settleMatchedPair(aliceOrder, bobOrder, 1e18, 1e18);
    }

    function test_settleMatchedPair_revertsForNonOwner() public {
        vm.prank(alice);
        uint256 aliceOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenIn), address(tokenOut), 1e18, 1, uint64(block.timestamp + 1 hours)
        );
        vm.prank(bob);
        uint256 bobOrder = registry.submitOrder(
            PoolId.wrap(bytes32(uint256(1))), address(tokenOut), address(tokenIn), 1e18, 1, uint64(block.timestamp + 1 hours)
        );

        vm.prank(alice);
        vm.expectRevert(bytes("not owner"));
        registry.settleMatchedPair(aliceOrder, bobOrder, 1e18, 1e18);
    }

    // ---------------------------------------------------------------------
    // Phase 2: Encrypted Order / Commitment Unit Tests
    // ---------------------------------------------------------------------

    function test_submitCommitment_hidesDirectionAndLimits() public {
        PoolId poolId = PoolId.wrap(bytes32(uint256(1)));
        bytes32 secret = keccak256("alice-secret-salt-123");
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes32 commitment = registry.computeCommitment(poolId, address(tokenIn), address(tokenOut), 1e18, 3000e18, expiry, secret);

        vm.prank(alice);
        uint256 orderId = registry.submitCommitment(poolId, address(tokenIn), 1e18, commitment, expiry);

        // Funds are safely escrowed
        assertEq(tokenIn.balanceOf(address(registry)), 1e18);
        assertEq(tokenIn.balanceOf(alice), 9e18);

        // Direction and limits are completely hidden (address(0) and 0)
        (
            address owner,
            PoolId pId,
            address tIn,
            address tOut,
            uint256 amountIn,
            uint256 minAmountOut,
            ,
            ,
            ,
            EclipseOrderRegistry.OrderStatus status
        ) = registry.orders(orderId);

        assertEq(owner, alice);
        assertEq(PoolId.unwrap(pId), PoolId.unwrap(poolId));
        assertEq(tIn, address(tokenIn));
        assertEq(tOut, address(0)); // HIDDEN
        assertEq(amountIn, 1e18);
        assertEq(minAmountOut, 0); // HIDDEN
        assertEq(uint8(status), uint8(EclipseOrderRegistry.OrderStatus.Locked));

        (bytes32 storedCommitment, bool isCommitted, bool isRevealed) = registry.commitments(orderId);
        assertEq(storedCommitment, commitment);
        assertTrue(isCommitted);
        assertFalse(isRevealed);
    }

    function test_revealCommitment_successOpensOrder() public {
        PoolId poolId = PoolId.wrap(bytes32(uint256(1)));
        bytes32 secret = keccak256("alice-secret-salt-123");
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes32 commitment = registry.computeCommitment(poolId, address(tokenIn), address(tokenOut), 1e18, 3000e18, expiry, secret);

        vm.prank(alice);
        uint256 orderId = registry.submitCommitment(poolId, address(tokenIn), 1e18, commitment, expiry);

        // Matcher or Alice reveals with preimage
        vm.prank(matcher);
        registry.revealCommitment(orderId, address(tokenOut), 3000e18, secret);

        // Order is now Open with tokenOut and minAmountOut exposed for matching
        (,,, address tOut,, uint256 minAmountOut,,,, EclipseOrderRegistry.OrderStatus status) = registry.orders(orderId);
        assertEq(tOut, address(tokenOut));
        assertEq(minAmountOut, 3000e18);
        assertEq(uint8(status), uint8(EclipseOrderRegistry.OrderStatus.Open));

        (,, bool isRevealed) = registry.commitments(orderId);
        assertTrue(isRevealed);
    }

    function test_revealCommitment_revertsOnTamperedPreimage() public {
        PoolId poolId = PoolId.wrap(bytes32(uint256(1)));
        bytes32 secret = keccak256("alice-secret-salt-123");
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes32 commitment = registry.computeCommitment(poolId, address(tokenIn), address(tokenOut), 1e18, 3000e18, expiry, secret);

        vm.prank(alice);
        uint256 orderId = registry.submitCommitment(poolId, address(tokenIn), 1e18, commitment, expiry);

        // Tampering with minAmountOut (attacker or faulty relayer tries to change limit)
        vm.prank(matcher);
        vm.expectRevert(EclipseOrderRegistry.CommitmentMismatch.selector);
        registry.revealCommitment(orderId, address(tokenOut), 2500e18, secret);

        // Tampering with secret
        vm.prank(matcher);
        vm.expectRevert(EclipseOrderRegistry.CommitmentMismatch.selector);
        registry.revealCommitment(orderId, address(tokenOut), 3000e18, keccak256("wrong-salt"));
    }

    function test_revealCommitment_revertsForUnauthorizedRevealer() public {
        PoolId poolId = PoolId.wrap(bytes32(uint256(1)));
        bytes32 secret = keccak256("alice-secret-salt-123");
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes32 commitment = registry.computeCommitment(poolId, address(tokenIn), address(tokenOut), 1e18, 3000e18, expiry, secret);

        vm.prank(alice);
        uint256 orderId = registry.submitCommitment(poolId, address(tokenIn), 1e18, commitment, expiry);

        // Third party (Bob) tries to trigger reveal
        vm.prank(bob);
        vm.expectRevert(EclipseOrderRegistry.NotOrderOwner.selector);
        registry.revealCommitment(orderId, address(tokenOut), 3000e18, secret);
    }
}

