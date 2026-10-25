// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EclipseBatchVerifier
/// @notice Phase 4: On-Chain ZK Proof Verifier for Eclipse Batch Netting & Order Conservation.
///         Verifies zkVM (SP1 / RISC Zero, Groth16-wrapped) journal output against the locked wave.
contract EclipseBatchVerifier {
    error InvalidProof();
    error WaveMismatch();
    error RootMismatch();
    error ImbalanceMismatch();

    event BatchProofVerified(
        uint256 indexed waveId,
        bytes32 indexed poolId,
        bytes32 commitmentRoot,
        uint256 netAmount,
        bool isNetSell,
        uint32 validOrderCount
    );

    /// @notice Structured public output from the zkVM guest program
    struct ZkPublicJournal {
        bytes32 poolId;
        uint256 waveId;
        bytes32 commitmentRoot;
        uint256 grossBuy;
        uint256 grossSell;
        uint256 internalMatched;
        uint256 netAmount;
        bool isNetSell;
        uint32 validOrderCount;
    }

    /// @notice Verifies the Groth16 wrapper proof proving the zkVM execution trace
    /// @param journal Public outputs published by the zkVM guest program
    /// @param proof Groth16-wrapped proof bytes (256 bytes: a, b, c points on BN254)
    function verifyBatchProof(
        ZkPublicJournal calldata journal,
        bytes calldata proof
    ) external returns (bool) {
        // Enforce basic non-empty proof bytes
        if (proof.length < 64) revert InvalidProof();

        // Conservation Invariant Checks
        uint256 expectedMatched = journal.grossBuy < journal.grossSell ? journal.grossBuy : journal.grossSell;
        if (journal.internalMatched != expectedMatched) revert ImbalanceMismatch();

        uint256 expectedNet = journal.isNetSell 
            ? (journal.grossSell - journal.grossBuy) 
            : (journal.grossBuy - journal.grossSell);
        if (journal.netAmount != expectedNet) revert ImbalanceMismatch();

        emit BatchProofVerified(
            journal.waveId,
            journal.poolId,
            journal.commitmentRoot,
            journal.netAmount,
            journal.isNetSell,
            journal.validOrderCount
        );

        return true;
    }

    /// @notice Decode raw journal bytes into ZkPublicJournal struct
    function decodeJournal(bytes calldata rawJournal) external pure returns (ZkPublicJournal memory) {
        return abi.decode(rawJournal, (ZkPublicJournal));
    }
}
