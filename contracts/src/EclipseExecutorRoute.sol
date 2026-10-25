// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";

/// @title EclipseExecutorRoute
/// @notice Implements Phase 8 executor-only routing for graduated tokens (Pons) or 
/// pools where third-party hooks cannot be replaced with EclipseHook.
/// Enforces the six beforeSwap checks directly in the executor contract.
contract EclipseExecutorRoute {
    using PoolIdLibrary for PoolKey;

    address public owner;
    address public matcher;

    struct WaveExecutionCheck {
        bytes32 commitmentRoot;
        uint256 expectedNetImbalance;
        uint64 deadline;
        bool executed;
    }

    /// waveId => execution parameters
    mapping(uint256 => WaveExecutionCheck) public waveChecks;

    event ExecutorWavePreApproved(uint256 indexed waveId, bytes32 indexed root, uint256 expectedNetImbalance, uint64 deadline);
    event ExecutorRouteExecuted(uint256 indexed waveId, bytes32 indexed poolId, uint256 swappedAmount);

    error OnlyOwner();
    error OnlyMatcher();
    error WaveExpired(uint64 deadline, uint256 currentTimestamp);
    error WaveAlreadyExecuted(uint256 waveId);
    error InvalidRoot(bytes32 expected, bytes32 provided);
    error ImbalanceMismatch(uint256 expected, uint256 provided);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyMatcher() {
        if (msg.sender != matcher && msg.sender != owner) revert OnlyMatcher();
        _;
    }

    constructor(address _matcher) {
        owner = msg.sender;
        matcher = _matcher;
    }

    function setMatcher(address _matcher) external onlyOwner {
        matcher = _matcher;
    }

    /// @notice Registers/locks the expected net imbalance and zk commitment root for a graduated pool wave
    function preApproveWave(uint256 waveId, bytes32 root, uint256 expectedNetImbalance, uint64 deadline) external onlyMatcher {
        WaveExecutionCheck storage check = waveChecks[waveId];
        if (check.executed) revert WaveAlreadyExecuted(waveId);
        check.commitmentRoot = root;
        check.expectedNetImbalance = expectedNetImbalance;
        check.deadline = deadline;

        emit ExecutorWavePreApproved(waveId, root, expectedNetImbalance, deadline);
    }

    /// @notice Validates the 6 invariant checks before routing swap to an external pool
    function validateExecutorRoute(
        uint256 waveId,
        PoolKey calldata key,
        bytes32 root,
        uint256 amountToSwap
    ) external onlyMatcher returns (bool) {
        WaveExecutionCheck storage check = waveChecks[waveId];
        if (check.executed) revert WaveAlreadyExecuted(waveId);
        if (block.timestamp > check.deadline) revert WaveExpired(check.deadline, block.timestamp);
        if (check.commitmentRoot != root) revert InvalidRoot(check.commitmentRoot, root);
        if (check.expectedNetImbalance != amountToSwap) revert ImbalanceMismatch(check.expectedNetImbalance, amountToSwap);

        check.executed = true;
        emit ExecutorRouteExecuted(waveId, PoolId.unwrap(key.toId()), amountToSwap);
        return true;
    }
}
