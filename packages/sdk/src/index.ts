import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodePacked,
  keccak256,
  toBytes,
} from "viem";

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_TESTNET_CHAIN_ID = ROBINHOOD_CHAIN_ID;

export const ECLIPSE_DEPLOYED_CONTRACTS = {
  hook: "0x47c68C343C422790F998e9F777865554732560c4" as Address,
  orderRegistry: "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad" as Address,
  batchVerifier: "0x5b19C43F23DBfe73292FFC22a4147322ab90104F" as Address,
  privateSettlement: "0xAe07dB429A0902fB7f505a296E12C254A468eA74" as Address,
  specterAdapter: "0xcB548BA082ADA0D4FD37E8Cea4017212d6204343" as Address,
  executorRoute: "0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265" as Address,
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951" as Address,
  mockWeth: "0xb8A83409F449A87D73034F87EdDd191d97D72Dc6" as Address,
  mockUsdg: "0x223F45A00B3212f4ec052450624C63eC457F2482" as Address,
  mockPons: "0xB1f64237714bFAf6941911aE821e66e8BbD01143" as Address,
  mockNvda: "0xdD453d93A8DCB74D75eD2aaD6bD967059d0BC545" as Address,
} as const;

export interface EclipseClientConfig {
  chainId?: number;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  contracts?: Partial<typeof ECLIPSE_DEPLOYED_CONTRACTS>;
}

export interface SubmitCommitmentParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  expiry: bigint;
  salt?: Hex;
}

export interface RevealCommitmentParams {
  orderId: bigint;
  tokenOut: Address;
  minAmountOut: bigint;
  salt: Hex;
}

export interface ClaimPrivatePayoutParams {
  waveId: bigint;
  recipient: Address;
  token: Address;
  amount: bigint;
  nullifier: Hex;
  merkleProof: Hex[];
}

export interface ShieldedIntentParams {
  stealthOwner: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  expiry: bigint;
  commitmentSalt?: Hex;
}

export class EclipseClient {
  public readonly chainId: number;
  public readonly publicClient: PublicClient;
  public readonly walletClient?: WalletClient;
  public readonly contracts: typeof ECLIPSE_DEPLOYED_CONTRACTS;

  constructor(config: EclipseClientConfig) {
    this.chainId = config.chainId ?? ROBINHOOD_TESTNET_CHAIN_ID;
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.contracts = {
      ...ECLIPSE_DEPLOYED_CONTRACTS,
      ...(config.contracts ?? {}),
    };
  }

  /**
   * Computes the deterministic commitment hash hiding tokenOut and minAmountOut.
   * Matches EclipseOrderRegistry.computeCommitment()
   */
  public computeCommitment(
    owner: Address,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    minAmountOut: bigint,
    expiry: bigint,
    salt: Hex
  ): Hex {
    return keccak256(
      encodePacked(
        ["address", "address", "address", "uint256", "uint256", "uint256", "bytes32"],
        [owner, tokenIn, tokenOut, amountIn, minAmountOut, expiry, salt]
      )
    );
  }

  /**
   * Generates a cryptographically random 32-byte salt hex
   */
  public generateSalt(): Hex {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      return ("0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
    }
    // Fallback pseudo-random for headless Node if crypto not globally bound
    const rand = Math.random().toString(36) + Date.now().toString(36);
    return keccak256(toBytes(rand));
  }

  /**
   * Helper to format human amounts or parse unit equivalents
   */
  public static parseUnits(value: string, decimals = 18): bigint {
    const [whole, frac = ""] = value.split(".");
    const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(whole + paddedFrac);
  }
}
