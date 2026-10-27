[![Robinhood Chain](https://img.shields.io/badge/Robinhood_Chain-Mainnet_4663-111827?style=flat-square&logo=ethereum)](https://robinhoodchain.blockscout.com)
[![Uniswap v4 Hook](https://img.shields.io/badge/Uniswap_v4-Hook_Enabled-ff007a?style=flat-square)](https://github.com/Uniswap/v4-core)
[![zkVM Verified](https://img.shields.io/badge/ZK-zkVM_Groth16-83e8c0?style=flat-square)]()
[![TypeScript SDK](https://img.shields.io/badge/SDK-%40eclipse%2Fsdk-3178c6?style=flat-square)](https://github.com/wealthy-org/Eclipse/tree/main/packages/sdk)
[![Twitter/X](https://img.shields.io/badge/Twitter-@eclipsehook-000000?style=flat-square&logo=x)](https://x.com/eclipsehook)

> **Private while it forms. Public once it settles.**  
> Eclipse is an institutional-grade dark pool and confidential batch auction protocol built on Robinhood Chain. It shields large trades from toxic MEV and public mempool front-running through zero-knowledge verifiable netting, settling residual imbalances through native Uniswap v4 liquidity hooks. Follow [@eclipsehook](https://x.com/eclipsehook) for updates.

---

## Deployed Smart Contracts

Architecture contracts targeted for **Robinhood Chain** (Chain ID: `4663`, Currency: `ETH`):

| Contract | Address | Network | Description |
|:---|:---|:---|:---|
| **`EclipseOrderRegistry`** | [`0xA697AD15EB193c7e23c4208606587c2FEfDf92ad`](https://robinhoodchain.blockscout.com/address/0xA697AD15EB193c7e23c4208606587c2FEfDf92ad) | Robinhood 4663 | Encrypted commitment escrow & internal match settlement |
| **`EclipseHook`** | [`0x47c68C343C422790F998e9F777865554732560c4`](https://testnet.explorer.chain.robinhood.com/address/0x47c68C343C422790F998e9F777865554732560c4) | Robinhood 46630 | Uniswap v4 Hook with dynamic wave locking & 5 bps fee |
| **`EclipseBatchVerifier`** | [`0x5b19C43F23DBfe73292FFC22a4147322ab90104F`](https://testnet.explorer.chain.robinhood.com/address/0x5b19C43F23DBfe73292FFC22a4147322ab90104F) | Robinhood 46630 | On-chain Groth16 verification of zkVM batch execution |
| **`EclipsePrivateSettlement`**| [`0xAe07dB429A0902fB7f505a296E12C254A468eA74`](https://testnet.explorer.chain.robinhood.com/address/0xAe07dB429A0902fB7f505a296E12C254A468eA74) | Robinhood 46630 | Stealth payout distributor with nullifier anti-double-spend |
| **`SpecterEclipseAdapter`** | [`0xcB548BA082ADA0D4FD37E8Cea4017212d6204343`](https://testnet.explorer.chain.robinhood.com/address/0xcB548BA082ADA0D4FD37E8Cea4017212d6204343) | Robinhood 46630 | Headless adapter for private wallet intents |
| **`EclipseExecutorRoute`** | [`0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265`](https://testnet.explorer.chain.robinhood.com/address/0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265) | Robinhood 46630 | Executor-only hook validation for graduated pool tokens |
| **Uniswap v4 `PoolManager`** | [`0x8366a39cc670b4001a1121b8f6a443a643e40951`](https://testnet.explorer.chain.robinhood.com/address/0x8366a39cc670b4001a1121b8f6a443a643e40951) | Robinhood 46630 | Official Uniswap v4 Core singleton |

### Supported Asset Tokens:
- **Mock WETH**: `0xb8A83409F449A87D73034F87EdDd191d97D72Dc6`
- **Mock USDG**: `0x223F45A00B3212f4ec052450624C63eC457F2482`
- **Mock NVDA (Tokenized US Equity)**: `0xdD453d93A8DCB74D75eD2aaD6bD967059d0BC545`
- **Mock PONS (Graduated Community Token)**: `0xB1f64237714bFAf6941911aE821e66e8BbD01143`

---

## Active Markets

| Pair | Asset Class | Route Mechanism | Protocol Fee | Settlement |
|:---|:---|:---|:---|:---|
| **WETH / USDG** | Crypto Native | Uniswap v4 · EclipseHook | 5 bps (0.05%) | zkVM Groth16 Proved |
| **NVDA / USDG** | Tokenized Equity (RWA) | 24/7 Dark Pool Batch Netting | 5 bps (0.05%) | zkVM Groth16 Proved |
| **PONS / USDG** | Graduated Community Token | Executor-Only Hook Route | 5 bps (0.05%) | On-Chain Enforced |

---

## Repository Structure

```text
Eclipse/
├── app/                      # Next.js 16 Web Application (App Router, Turbopack)
│   ├── (app)/
│   │   ├── market/[id]/      # Interactive Trading Terminal & On-chain execution
│   │   ├── markets/          # Live market cards & 24h continuous sparklines
│   │   ├── waves/            # Dynamic Dual-Sided Netting Engine & batch telemetry
│   │   ├── stats/            # Institutional metrics, volume analytics & MEV savings
│   │   └── privacy/          # MEV sandwiching simulator & security specifications
│   ├── api/                  # High-performance serverless endpoints with in-memory caching
│   └── lib/                  # Web3 config (wagmi, viem), ABI definitions, DB client
├── contracts/                # Foundry smart contracts suite
│   ├── src/                  # EclipseHook, EclipseOrderRegistry, Verifiers, Adapters
│   ├── script/               # Deployment and testnet wiring scripts
│   └── test/                 # 33+ comprehensive Foundry invariant and unit tests
├── packages/
│   └── sdk/                  # @eclipse/sdk typed client library for bots & integrators
├── services/
│   └── matcher/              # Background matching engine & indexer daemon (Railway)
│       ├── src/              # Sync, auto-reveal, internal matching, and netting core
│       └── schema.sql        # NeonDB PostgreSQL schema
└── zk/                       # Rust zkVM guest circuits proving netting invariants
```

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- Foundry (`forge`, `cast`, `anvil`)
- Rust toolchain (for zkVM circuit verification)

### 1. Web Application Setup
```bash
# Clone the repository
git clone https://github.com/wealthy-org/Eclipse.git
cd Eclipse

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the terminal.

### 2. Smart Contracts (Foundry)
```bash
cd contracts

# Install dependencies
forge install

# Run comprehensive test suite
forge test -vvv
```

### 3. Matcher & Indexer Daemon
```bash
cd services/matcher

# Install dependencies
npm install

# Run database migration
npm run migrate

# Run background synchronization daemon
npm run daemon
```

---

## Integration with `@eclipse/sdk`

Integrators, automated market makers, and trading bots can submit orders programmatically:

```typescript
import { EclipseClient, computeCommitment, generateSalt } from "@eclipse/sdk";
import { parseUnits } from "viem";

const client = new EclipseClient({
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  registryAddress: "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad",
});

// 1. Generate client-side cryptographic salt
const secret = generateSalt();

// 2. Hash commitment to hide limit price and direction
const commitment = computeCommitment({
  owner: userAddress,
  tokenIn: "0x223F45A00B3212f4ec052450624C63eC457F2482", // USDG
  tokenOut: "0xb8A83409F449A87D73034F87EdDd191d97D72Dc6", // WETH
  amountIn: parseUnits("10000", 18),
  minAmountOut: parseUnits("3.18", 18),
  salt: secret,
});

// 3. Submit dark order commitment to on-chain registry
await client.submitDarkOrder({ commitment, amountIn: parseUnits("10000", 18) });
```

---

## Security & Privacy Invariants

- **Zero Information Leakage:** Trade directions and minimum amounts out are masked as zeroes until wave cutoff.
- **Strict Conservation of Value:** No token balance can be created or destroyed during internal batch crossing (checked both in smart contract logic and in Rust zkVM constraints).
- **Double-Spend Immunity:** Private claims utilize unique deterministic nullifiers stored on-chain in `spentNullifiers`.
- **Slippage Enforcement:** Every matched order is guaranteed to execute at or better than `minAmountOut`, or it remains uncrossed for public hook routing.

---

## License

This project is licensed under the [MIT License](LICENSE).
