// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EclipseBatchVerifier} from "../src/EclipseBatchVerifier.sol";

contract EclipseBatchVerifierTest is Test {
    EclipseBatchVerifier internal verifier;

    function setUp() public {
        verifier = new EclipseBatchVerifier();
    }

    function test_verifyBatchProof_success() public {
        EclipseBatchVerifier.ZkPublicJournal memory journal = EclipseBatchVerifier.ZkPublicJournal({
            poolId: bytes32(uint256(1)),
            waveId: 201,
            commitmentRoot: bytes32(uint256(0x999)),
            grossBuy: 84_200,
            grossSell: 69_400,
            internalMatched: 69_400,
            netAmount: 14_800,
            isNetSell: false,
            validOrderCount: 15
        });

        // 256 bytes simulated Groth16 wrapper proof
        bytes memory proof = new bytes(256);

        bool ok = verifier.verifyBatchProof(journal, proof);
        assertTrue(ok, "valid batch proof should verify successfully");
    }

    function test_verifyBatchProof_revertsOnImbalanceTampering() public {
        EclipseBatchVerifier.ZkPublicJournal memory tamperedJournal = EclipseBatchVerifier.ZkPublicJournal({
            poolId: bytes32(uint256(1)),
            waveId: 201,
            commitmentRoot: bytes32(uint256(0x999)),
            grossBuy: 84_200,
            grossSell: 69_400,
            internalMatched: 69_400,
            netAmount: 99_999, // tampered net imbalance!
            isNetSell: false,
            validOrderCount: 15
        });

        bytes memory proof = new bytes(256);

        vm.expectRevert(EclipseBatchVerifier.ImbalanceMismatch.selector);
        verifier.verifyBatchProof(tamperedJournal, proof);
    }
}
