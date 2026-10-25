// Phase 1 contract addresses, deployed to Robinhood Chain testnet (46630) per
// 25/Eclipse/contracts/broadcast/*/46630/run-latest.json. Mock WETH/USDG stand in for the real
// tokens until Robinhood Chain's own WETH/USDG are confirmed (see ROBINHOOD_POOL_MATRIX.md).
export const ECLIPSE_HOOK_ADDRESS = "0x47c68C343C422790F998e9F777865554732560c4" as const;
export const ECLIPSE_ORDER_REGISTRY_ADDRESS = "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad" as const;
export const ECLIPSE_BATCH_VERIFIER_ADDRESS = "0x5b19C43F23DBfe73292FFC22a4147322ab90104F" as const;
export const ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS = "0xAe07dB429A0902fB7f505a296E12C254A468eA74" as const;
export const SPECTER_ECLIPSE_ADAPTER_ADDRESS = "0xcB548BA082ADA0D4FD37E8Cea4017212d6204343" as const;
export const ECLIPSE_EXECUTOR_ROUTE_ADDRESS = "0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265" as const;
/// Block the registry was deployed at — bounds event log scans so the frontend never has to
/// scan from genesis.
export const ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK = BigInt(142478553);
export const POOL_MANAGER_ADDRESS = "0x8366a39cc670b4001a1121b8f6a443a643e40951" as const;

export const MOCK_TOKENS = {
  WETH: "0xb8A83409F449A87D73034F87EdDd191d97D72Dc6" as const,
  USDG: "0x223F45A00B3212f4ec052450624C63eC457F2482" as const,
  PONS: "0xB1f64237714bFAf6941911aE821e66e8BbD01143" as const,
  NVDA: "0xdD453d93A8DCB74D75eD2aaD6bD967059d0BC545" as const,
};

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const ORDER_REGISTRY_ABI = [
  {
    type: "function",
    name: "submitCommitment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "commitment", type: "bytes32" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "computeCommitment",
    stateMutability: "pure",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "secret", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "submitOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "cancelOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "currentWaveId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "orders",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "poolId", type: "bytes32" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "filledIn", type: "uint256" },
      { name: "waveId", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "revealCommitment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "tokenOut", type: "address" },
      { name: "minAmountOut", type: "uint256" },
      { name: "secret", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "CommitmentSubmitted",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "tokenIn", type: "address", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "waveId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CommitmentRevealed",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "tokenOut", type: "address", indexed: false },
      { name: "minAmountOut", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderSubmitted",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "tokenIn", type: "address", indexed: false },
      { name: "tokenOut", type: "address", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "minAmountOut", type: "uint256", indexed: false },
      { name: "waveId", type: "uint256", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
    ],
  },
] as const;

/// Zero PoolId placeholder — Phase 1 only has one pool, so the registry doesn't gate on it yet.
export const ZERO_POOL_ID = "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;
