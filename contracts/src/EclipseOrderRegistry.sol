// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {PoolId} from "v4-core/types/PoolId.sol";

/// @title EclipseOrderRegistry
/// @notice Phase 1 (transparent batch prototype, brief §20 Phase A / §61) order submission and
///         escrow. A user signs one approval and one `submitOrder` transaction; the contract
///         escrows `amountIn`, assigns the order to the wave open when it was submitted, and
///         the off-chain matcher (single operator, brief §30 V1) reads these orders to build a
///         settlement plan. This contract does **not** swap or settle — that stays the matcher's
///         job plus `EclipseHook`'s on-chain enforcement (see HOOK_DESIGN.md). Orders here are
///         plaintext on purpose: encryption/commitments are Phase 2 (brief §20 Phase B), not
///         re-derived here.
///
/// @dev Illustrative, unaudited, Phase 1 code. Not deployed to any mainnet.
contract EclipseOrderRegistry {
    error NotOrderOwner();
    error OrderNotOpen();
    error OrderExpired();
    error ZeroAmount();
    error TransferFailed();
    error TokenMismatch();
    error MatchExceedsRemaining();
    error SlippageViolated(uint256 orderId, uint256 minAcceptable, uint256 actual);

    enum OrderStatus {
        Open, // submitted, waiting for its wave to lock
        Cancelled, // withdrawn by its owner before being locked into a wave
        Locked, // the matcher has included it in a wave's settlement plan (off-chain) — informational only, set by the operator
        Settled // the matcher marked it paid out
    }

    struct Order {
        address owner;
        PoolId poolId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn; // original escrowed amount — never mutated after submission
        uint256 minAmountOut; // minimum output for the FULL amountIn, pro-rated per partial fill
        uint256 filledIn; // cumulative amountIn matched/settled so far; remaining = amountIn - filledIn
        uint256 waveId;
        uint64 expiry;
        OrderStatus status;
    }

    /// @dev Matches the frontend terminal's simulated wave clock (30s waves) so an order's
    ///      `waveId` lines up with what the UI already shows the user as "next Eclipse Wave".
    ///      Phase 3 replaces this with the real `EclipseWaveManager`'s on-chain wave clock.
    uint256 public constant WAVE_DURATION = 30 seconds;
    uint256 public immutable waveEpoch;

    address public owner;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderSubmitted(
        uint256 indexed orderId,
        address indexed owner,
        PoolId indexed poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 waveId,
        uint64 expiry
    );
    event OrderCancelled(uint256 indexed orderId);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status);
    event OrdersMatched(uint256 indexed orderIdA, uint256 indexed orderIdB, uint256 amountAToB, uint256 amountBToA);
    event CommitmentSubmitted(uint256 indexed orderId, address indexed owner, bytes32 indexed commitment, address tokenIn, uint256 amountIn, uint256 waveId);
    event CommitmentRevealed(uint256 indexed orderId, bytes32 indexed commitment, address tokenOut, uint256 minAmountOut);

    error CommitmentMismatch();
    error NotCommitted();
    error AlreadyRevealed();

    struct CommitmentOrder {
        bytes32 commitment;
        bool isCommitted;
        bool isRevealed;
    }

    mapping(uint256 => CommitmentOrder) public commitments;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        waveEpoch = block.timestamp;
    }

    function currentWaveId() public view returns (uint256) {
        return (block.timestamp - waveEpoch) / WAVE_DURATION;
    }

    /// @notice Phase 2: Compute deterministic commitment hash (brief §12)
    function computeCommitment(
        PoolId poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint64 expiry,
        bytes32 secret
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(poolId, tokenIn, tokenOut, amountIn, minAmountOut, expiry, secret));
    }

    /// @notice Phase 2: Submit an encrypted order commitment.
    ///         Public observers only see the commitment hash, tokenIn, and amountIn escrowed.
    ///         The target direction (tokenOut), limit (minAmountOut), and secret remain private.
    function submitCommitment(
        PoolId poolId,
        address tokenIn,
        uint256 amountIn,
        bytes32 commitment,
        uint64 expiry
    ) external returns (uint256 orderId) {
        if (amountIn == 0) revert ZeroAmount();
        if (expiry <= block.timestamp) revert OrderExpired();
        if (commitment == bytes32(0)) revert ZeroAmount();

        bool ok = IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (!ok) revert TransferFailed();

        orderId = nextOrderId++;
        uint256 waveId = currentWaveId();

        orders[orderId] = Order({
            owner: msg.sender,
            poolId: poolId,
            tokenIn: tokenIn,
            tokenOut: address(0), // hidden until reveal
            amountIn: amountIn,
            minAmountOut: 0, // hidden until reveal
            filledIn: 0,
            waveId: waveId,
            expiry: expiry,
            status: OrderStatus.Locked // held in commitment until wave cutoff/reveal
        });

        commitments[orderId] = CommitmentOrder({
            commitment: commitment,
            isCommitted: true,
            isRevealed: false
        });

        emit CommitmentSubmitted(orderId, msg.sender, commitment, tokenIn, amountIn, waveId);
    }

    /// @notice Phase 2: Reveal commitment at wave cutoff.
    ///         Can be called by the owner or authorized Matcher with valid preimage.
    function revealCommitment(
        uint256 orderId,
        address tokenOut,
        uint256 minAmountOut,
        bytes32 secret
    ) external {
        CommitmentOrder storage c = commitments[orderId];
        if (!c.isCommitted) revert NotCommitted();
        if (c.isRevealed) revert AlreadyRevealed();

        Order storage o = orders[orderId];
        if (msg.sender != o.owner && msg.sender != owner) revert NotOrderOwner();

        bytes32 expected = computeCommitment(o.poolId, o.tokenIn, tokenOut, o.amountIn, minAmountOut, o.expiry, secret);
        if (expected != c.commitment) revert CommitmentMismatch();

        c.isRevealed = true;
        o.tokenOut = tokenOut;
        o.minAmountOut = minAmountOut;
        o.status = OrderStatus.Open; // ready for batch matching!

        emit CommitmentRevealed(orderId, c.commitment, tokenOut, minAmountOut);
    }

    /// @notice Submit a plain private-order-flow intent (Phase 1 legacy compatibility).
    function submitOrder(PoolId poolId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint64 expiry)
        external
        returns (uint256 orderId)
    {
        if (amountIn == 0) revert ZeroAmount();
        if (expiry <= block.timestamp) revert OrderExpired();

        bool ok = IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (!ok) revert TransferFailed();

        orderId = nextOrderId++;
        uint256 waveId = currentWaveId();
        orders[orderId] = Order({
            owner: msg.sender,
            poolId: poolId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            filledIn: 0,
            waveId: waveId,
            expiry: expiry,
            status: OrderStatus.Open
        });

        emit OrderSubmitted(orderId, msg.sender, poolId, tokenIn, tokenOut, amountIn, minAmountOut, waveId, expiry);
    }

    /// @notice Withdraw an order and its escrowed funds, as long as the matcher has not yet
    ///         locked it into a wave's settlement plan.
    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (o.owner != msg.sender) revert NotOrderOwner();
        if (o.status != OrderStatus.Open) revert OrderNotOpen();

        o.status = OrderStatus.Cancelled;
        bool ok = IERC20(o.tokenIn).transfer(msg.sender, o.amountIn);
        if (!ok) revert TransferFailed();

        emit OrderCancelled(orderId);
    }

    /// @notice Matcher-only bookkeeping: mark an order Locked (included in a wave) or Settled
    ///         (paid out). Brief §30/§31: the matcher can delay or exclude an order, never steal
    ///         funds — this function only ever flips a status flag, it cannot move tokens out of
    ///         escrow for anyone other than the order's own owner (see `settleOrderPayout`).
    function setOrderStatus(uint256 orderId, OrderStatus status) external onlyOwner {
        orders[orderId].status = status;
        emit OrderStatusChanged(orderId, status);
    }

    /// @notice Internal netting (brief §14): settle two opposite-direction orders directly
    ///         against each other's escrow — no external funding needed, since each order's
    ///         escrowed `tokenIn` is exactly what the other side wants as output. This is how
    ///         matched volume inside a wave gets paid out; only the net leftover beyond a full
    ///         match needs `settleOrderPayout` against funds from an actual pool swap.
    /// @dev Enforces brief §17 slippage protection pro-rated per partial fill: neither side may
    ///      receive less than its `minAmountOut` scaled to the portion of `amountIn` being
    ///      matched right now. Matcher-only — it can choose not to match an order, but it can
    ///      never make either side receive less than its own declared minimum.
    function settleMatchedPair(uint256 orderIdA, uint256 orderIdB, uint256 amountAToB, uint256 amountBToA)
        external
        onlyOwner
    {
        Order storage a = orders[orderIdA];
        Order storage b = orders[orderIdB];

        if (a.tokenIn != b.tokenOut || b.tokenIn != a.tokenOut) revert TokenMismatch();
        if (a.status != OrderStatus.Open && a.status != OrderStatus.Locked) revert OrderNotOpen();
        if (b.status != OrderStatus.Open && b.status != OrderStatus.Locked) revert OrderNotOpen();
        if (amountAToB > a.amountIn - a.filledIn) revert MatchExceedsRemaining();
        if (amountBToA > b.amountIn - b.filledIn) revert MatchExceedsRemaining();

        uint256 minForA = (a.minAmountOut * amountAToB) / a.amountIn;
        if (amountBToA < minForA) revert SlippageViolated(orderIdA, minForA, amountBToA);
        uint256 minForB = (b.minAmountOut * amountBToA) / b.amountIn;
        if (amountAToB < minForB) revert SlippageViolated(orderIdB, minForB, amountAToB);

        a.filledIn += amountAToB;
        b.filledIn += amountBToA;
        a.status = a.filledIn == a.amountIn ? OrderStatus.Settled : OrderStatus.Locked;
        b.status = b.filledIn == b.amountIn ? OrderStatus.Settled : OrderStatus.Locked;

        if (amountAToB > 0) {
            bool okA = IERC20(a.tokenIn).transfer(b.owner, amountAToB);
            if (!okA) revert TransferFailed();
        }
        if (amountBToA > 0) {
            bool okB = IERC20(b.tokenIn).transfer(a.owner, amountBToA);
            if (!okB) revert TransferFailed();
        }

        emit OrdersMatched(orderIdA, orderIdB, amountAToB, amountBToA);
        emit OrderStatusChanged(orderIdA, a.status);
        emit OrderStatusChanged(orderIdB, b.status);
    }

    /// @notice Pays out a settled order's output to its owner. Phase 1: the matcher computes
    ///         the fill off-chain and calls this once funds are available; Phase 3+ moves this
    ///         into the real settlement contract driven by `EclipseHook`'s on-chain proof.
    function settleOrderPayout(uint256 orderId, address tokenOut, uint256 amountOut) external onlyOwner {
        Order storage o = orders[orderId];
        if (o.status != OrderStatus.Locked) revert OrderNotOpen();
        o.status = OrderStatus.Settled;
        bool ok = IERC20(tokenOut).transfer(o.owner, amountOut);
        if (!ok) revert TransferFailed();
        emit OrderStatusChanged(orderId, OrderStatus.Settled);
    }
}
