"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EclipseClient = exports.ECLIPSE_DEPLOYED_CONTRACTS = exports.ROBINHOOD_TESTNET_CHAIN_ID = void 0;
const viem_1 = require("viem");
exports.ROBINHOOD_TESTNET_CHAIN_ID = 46630;
exports.ECLIPSE_DEPLOYED_CONTRACTS = {
    hook: "0x47c68C343C422790F998e9F777865554732560c4",
    orderRegistry: "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad",
    batchVerifier: "0x5b19C43F23DBfe73292FFC22a4147322ab90104F",
    privateSettlement: "0xAe07dB429A0902fB7f505a296E12C254A468eA74",
    specterAdapter: "0xcB548BA082ADA0D4FD37E8Cea4017212d6204343",
    executorRoute: "0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265",
    poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
    mockWeth: "0xb8A83409F449A87D73034F87EdDd191d97D72Dc6",
    mockUsdg: "0x223F45A00B3212f4ec052450624C63eC457F2482",
    mockPons: "0xB1f64237714bFAf6941911aE821e66e8BbD01143",
    mockNvda: "0xdD453d93A8DCB74D75eD2aaD6bD967059d0BC545",
};
class EclipseClient {
    chainId;
    publicClient;
    walletClient;
    contracts;
    constructor(config) {
        this.chainId = config.chainId ?? exports.ROBINHOOD_TESTNET_CHAIN_ID;
        this.publicClient = config.publicClient;
        this.walletClient = config.walletClient;
        this.contracts = {
            ...exports.ECLIPSE_DEPLOYED_CONTRACTS,
            ...(config.contracts ?? {}),
        };
    }
    /**
     * Computes the deterministic commitment hash hiding tokenOut and minAmountOut.
     * Matches EclipseOrderRegistry.computeCommitment()
     */
    computeCommitment(owner, tokenIn, tokenOut, amountIn, minAmountOut, expiry, salt) {
        return (0, viem_1.keccak256)((0, viem_1.encodePacked)(["address", "address", "address", "uint256", "uint256", "uint256", "bytes32"], [owner, tokenIn, tokenOut, amountIn, minAmountOut, expiry, salt]));
    }
    /**
     * Generates a cryptographically random 32-byte salt hex
     */
    generateSalt() {
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
            const arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            return ("0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join(""));
        }
        // Fallback pseudo-random for headless Node if crypto not globally bound
        const rand = Math.random().toString(36) + Date.now().toString(36);
        return (0, viem_1.keccak256)((0, viem_1.toBytes)(rand));
    }
    /**
     * Helper to format human amounts or parse unit equivalents
     */
    static parseUnits(value, decimals = 18) {
        const [whole, frac = ""] = value.split(".");
        const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
        return BigInt(whole + paddedFrac);
    }
}
exports.EclipseClient = EclipseClient;
//# sourceMappingURL=index.js.map