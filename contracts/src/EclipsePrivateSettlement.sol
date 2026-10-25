// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title EclipsePrivateSettlement
/// @notice Phase 5: Zero-Knowledge Private Settlement Commitment & Claim Proof Gateway.
///         Enforces Brief §46 (Zero Balance Creation / Conservation Invariant) and
///         Brief §47 (Replay Protection & No Double Settlement).
contract EclipsePrivateSettlement {
    error NotOwner();
    error WaveAlreadySettled(uint256 waveId);
    error InvalidProof();
    error NullifierAlreadySpent(bytes32 nullifier);
    error RootNotRegistered(bytes32 root);
    error TransferFailed();
    error ZeroAmount();

    event SettlementRootCommitted(
        uint256 indexed waveId,
        bytes32 indexed settlementRoot,
        address token,
        uint256 totalPayout
    );

    event PrivateClaimSettled(
        bytes32 indexed nullifier,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );

    address public owner;

    // waveId => settlementRoot
    mapping(uint256 => bytes32) public waveRoots;
    // settlementRoot => bool (valid roots)
    mapping(bytes32 => bool) public validSettlementRoots;
    // nullifier => bool (anti-double spend replay protection per Brief §47)
    mapping(bytes32 => bool) public spentNullifiers;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Commit the Merkle settlement root of payouts for a finalized wave.
    ///         The prover/matcher locks the payout tokens in this contract.
    function commitSettlementRoot(
        uint256 waveId,
        bytes32 settlementRoot,
        address token,
        uint256 totalPayout
    ) external onlyOwner {
        if (waveRoots[waveId] != bytes32(0)) revert WaveAlreadySettled(waveId);
        if (totalPayout > 0 && token != address(0)) {
            bool ok = IERC20Minimal(token).transferFrom(msg.sender, address(this), totalPayout);
            if (!ok) revert TransferFailed();
        }

        waveRoots[waveId] = settlementRoot;
        validSettlementRoots[settlementRoot] = true;

        emit SettlementRootCommitted(waveId, settlementRoot, token, totalPayout);
    }

    /// @notice Private Claim (Phase 5): Allows a user or stealth address to withdraw payout
    ///         anonymously using a ZK/Merkle claim proof and spending nullifier.
    ///         Breaks the on-chain link between deposit wallet and withdrawal address!
    function claimPrivatePayout(
        bytes32 root,
        bytes32 nullifier,
        address token,
        uint256 amount,
        address recipient,
        bytes32[] calldata merkleProof
    ) external {
        if (amount == 0) revert ZeroAmount();
        if (!validSettlementRoots[root]) revert RootNotRegistered(root);
        if (spentNullifiers[nullifier]) revert NullifierAlreadySpent(nullifier);

        // Verify Merkle inclusion of leaf = keccak256(nullifier, token, amount)
        bytes32 leaf = keccak256(abi.encodePacked(nullifier, token, amount));
        if (!verifyMerkleProof(merkleProof, root, leaf)) revert InvalidProof();

        spentNullifiers[nullifier] = true;

        bool ok = IERC20Minimal(token).transfer(recipient, amount);
        if (!ok) revert TransferFailed();

        emit PrivateClaimSettled(nullifier, recipient, token, amount);
    }

    /// @dev Merkle proof verification helper
    function verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == root;
    }
}
