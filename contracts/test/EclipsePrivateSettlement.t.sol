// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EclipsePrivateSettlement} from "../src/EclipsePrivateSettlement.sol";

contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address sp, uint256 amt) external returns (bool) {
        allowance[msg.sender][sp] = amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "bal");
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        require(balanceOf[from] >= amt, "bal");
        require(allowance[from][msg.sender] >= amt, "allow");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

contract EclipsePrivateSettlementTest is Test {
    EclipsePrivateSettlement internal settlement;
    MockToken internal token;
    address internal alice = address(0xAA11);
    address internal bobStealth = address(0xBB22);

    function setUp() public {
        settlement = new EclipsePrivateSettlement();
        token = new MockToken();
        token.mint(address(this), 100_000 ether);
        token.approve(address(settlement), 100_000 ether);
    }

    function test_commitAndClaimPrivatePayout_success() public {
        bytes32 nullifier = keccak256(abi.encodePacked("secret-alice-order-1"));
        uint256 payoutAmt = 1_000 ether;

        // Leaf = keccak256(nullifier, token, amount)
        bytes32 leaf = keccak256(abi.encodePacked(nullifier, address(token), payoutAmt));
        bytes32 dummySibling = bytes32(uint256(0x1234));

        bytes32 root = leaf <= dummySibling
            ? keccak256(abi.encodePacked(leaf, dummySibling))
            : keccak256(abi.encodePacked(dummySibling, leaf));

        // 1. Relayer/Prover commits settlement root with escrowed payout tokens
        settlement.commitSettlementRoot(201, root, address(token), payoutAmt);

        // 2. Alice claims payout anonymously to fresh stealth address Bob
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = dummySibling;

        settlement.claimPrivatePayout(root, nullifier, address(token), payoutAmt, bobStealth, proof);

        assertEq(token.balanceOf(bobStealth), payoutAmt, "stealth recipient should receive payout");
        assertTrue(settlement.spentNullifiers(nullifier), "nullifier should be marked spent");
    }

    function test_claimPrivatePayout_revertsOnDoubleSpend() public {
        bytes32 nullifier = keccak256(abi.encodePacked("secret-alice-order-2"));
        uint256 payoutAmt = 500 ether;

        bytes32 leaf = keccak256(abi.encodePacked(nullifier, address(token), payoutAmt));
        bytes32 dummySibling = bytes32(uint256(0x5678));

        bytes32 root = leaf <= dummySibling
            ? keccak256(abi.encodePacked(leaf, dummySibling))
            : keccak256(abi.encodePacked(dummySibling, leaf));

        settlement.commitSettlementRoot(202, root, address(token), payoutAmt);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = dummySibling;

        settlement.claimPrivatePayout(root, nullifier, address(token), payoutAmt, bobStealth, proof);

        // Replay attempt must revert with NullifierAlreadySpent
        vm.expectRevert(abi.encodeWithSelector(EclipsePrivateSettlement.NullifierAlreadySpent.selector, nullifier));
        settlement.claimPrivatePayout(root, nullifier, address(token), payoutAmt, bobStealth, proof);
    }
}
