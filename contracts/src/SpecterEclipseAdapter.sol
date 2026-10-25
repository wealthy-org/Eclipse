// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEclipseOrderRegistry {
    function submitCommitment(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        bytes32 commitment,
        uint64 expiry
    ) external returns (uint256 orderId);
}

interface IEclipsePrivateSettlement {
    function claimPrivatePayout(
        bytes32 root,
        bytes32 nullifier,
        address token,
        uint256 amount,
        address recipient,
        bytes32[] calldata merkleProof
    ) external;
}

interface IERC20Token {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title SpecterEclipseAdapter
/// @notice Phase 6: Headless Execution Rail Adapter connecting Specter (or any shielded wallet)
///         to Eclipse Dark Pool Protocol without coupling protocol dependencies.
///         Enforces Brief §3, §21, and §66.
contract SpecterEclipseAdapter {
    error TransferFailed();
    error ZeroAmount();

    event SpecterIntentEscrowed(
        address indexed shieldedAccount,
        bytes32 indexed commitment,
        uint256 orderId,
        address tokenIn,
        uint256 amountIn
    );

    event SpecterPayoutRouted(
        bytes32 indexed nullifier,
        address indexed stealthRecipient,
        address token,
        uint256 amount
    );

    IEclipseOrderRegistry public immutable registry;
    IEclipsePrivateSettlement public immutable settlement;

    constructor(address _registry, address _settlement) {
        registry = IEclipseOrderRegistry(_registry);
        settlement = IEclipsePrivateSettlement(_settlement);
    }

    /// @notice Bridge function: Takes tokens from Specter shielded pool and escrows them
    ///         directly into Eclipse as an encrypted commitment order.
    function routeShieldedIntent(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        bytes32 commitment,
        uint64 expiry
    ) external returns (uint256 orderId) {
        if (amountIn == 0) revert ZeroAmount();

        // Transfer funds from Specter shielded vault / user to adapter
        bool ok = IERC20Token(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (!ok) revert TransferFailed();

        // Approve and submit commitment directly into EclipseOrderRegistry
        IERC20Token(tokenIn).approve(address(registry), amountIn);
        orderId = registry.submitCommitment(poolId, tokenIn, amountIn, commitment, expiry);

        emit SpecterIntentEscrowed(msg.sender, commitment, orderId, tokenIn, amountIn);
    }

    /// @notice Bridge function: Claims private payout from Eclipse via nullifier proof
    ///         and routes output anonymously directly back to Specter private vault/stealth address.
    function claimAndCreditShielded(
        bytes32 root,
        bytes32 nullifier,
        address token,
        uint256 amount,
        address stealthRecipient,
        bytes32[] calldata merkleProof
    ) external {
        settlement.claimPrivatePayout(root, nullifier, token, amount, stealthRecipient, merkleProof);
        emit SpecterPayoutRouted(nullifier, stealthRecipient, token, amount);
    }
}
