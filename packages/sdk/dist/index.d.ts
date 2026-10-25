import { type Address, type Hex, type PublicClient, type WalletClient } from "viem";
export declare const ROBINHOOD_TESTNET_CHAIN_ID = 46630;
export declare const ECLIPSE_DEPLOYED_CONTRACTS: {
    readonly hook: Address;
    readonly orderRegistry: Address;
    readonly batchVerifier: Address;
    readonly privateSettlement: Address;
    readonly specterAdapter: Address;
    readonly executorRoute: Address;
    readonly poolManager: Address;
    readonly mockWeth: Address;
    readonly mockUsdg: Address;
    readonly mockPons: Address;
    readonly mockNvda: Address;
};
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
export declare class EclipseClient {
    readonly chainId: number;
    readonly publicClient: PublicClient;
    readonly walletClient?: WalletClient;
    readonly contracts: typeof ECLIPSE_DEPLOYED_CONTRACTS;
    constructor(config: EclipseClientConfig);
    /**
     * Computes the deterministic commitment hash hiding tokenOut and minAmountOut.
     * Matches EclipseOrderRegistry.computeCommitment()
     */
    computeCommitment(owner: Address, tokenIn: Address, tokenOut: Address, amountIn: bigint, minAmountOut: bigint, expiry: bigint, salt: Hex): Hex;
    /**
     * Generates a cryptographically random 32-byte salt hex
     */
    generateSalt(): Hex;
    /**
     * Helper to format human amounts or parse unit equivalents
     */
    static parseUnits(value: string, decimals?: number): bigint;
}
//# sourceMappingURL=index.d.ts.map