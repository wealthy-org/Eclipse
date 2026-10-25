# Robinhood / Pool Matrix (Phase 0 Research)

**Status:** Research draft. This is the document that answers the user's "sampai ke testnet type" question — which network to actually build and demo Phase 1 on, versus the long-term Robinhood Chain target named in the brief's header (`**Target chain:** Robinhood Chain`).

---

## 1. Initial market strategy (brief §73/§55)

Per brief §73/§72: "Do not support every token... few high-volume markets rather than many small markets" — cold-start risk is "too few Eclipse users → little internal matching → weak advantage."

Recommended 1-3 markets, unchanged from the brief and already reflected in the Phase 1 landing-page demo:

1. **WETH / USDG** — the only one buildable and testable *today* (both sides are ordinary ERC-20s, no partner dependency). This is the Phase 1 target market.
2. **Graduated high-volume Pons token** — Phase 8, requires a live Pons deployment with a graduated v4 pool; blocked on Pons's own timeline, not Eclipse's.
3. **Selected Stock Token market (e.g. NVDA/USDG)** — Phase 9, blocked on Robinhood Chain Stock Token availability and legal review (brief §56). Treat as aspirational for Phase 1-7.

## 2. Robinhood Chain — what's actually known right now

Robinhood has not published developer-facing docs that this research pass could independently load (the brief's cited URLs, `docs.robinhood.com/chain/*`, redirect to `docs.chain.robinhood.com` territory that returned no fetchable content in this pass — treat as **access-gated or still forming**, re-check before Phase 8/9 kicks off). From secondary infrastructure-provider sources ([Chainstack](https://chainstack.com/what-is-robinhood-chain/), [QuickNode](https://www.quicknode.com/guides/robinhood/what-is-robinhood-chain), [Dwellir](https://www.dwellir.com/blog/what-is-robinhood-chain)):

- **Architecture:** EVM-compatible L2, built on **Arbitrum Orbit** (Nitro stack), settling to Ethereum with blob data availability, gas paid in ETH.
- **Sequencing:** a single Robinhood-operated sequencer, first-come-first-served ordering (no public decentralized sequencer yet) — this matters directly for Eclipse's MEV threat model (`THREAT_MODEL.md`), since a single sequencer is also a single point that *could* see wave-execution transactions before they land.
- **Confirmation:** fast sequencer confirmation, then ~13 minutes to Ethereum L1 finality; a 7-day challenge period applies to **bridge withdrawals only**, not ordinary transactions.
- **Chain IDs (per secondary sources, unverified against Robinhood's own docs):** mainnet `4663`, testnet `46630`.
- **Testnet status (per secondary sources):** a public testnet reportedly opened February 2026 with mainnet following July 2026 — **this timeline is from aggregator blog posts, not Robinhood's own changelog, and must be re-confirmed from `docs.chain.robinhood.com` directly before any Phase 8 planning assumes testnet access exists today.**
- **Stock Tokens:** described as ordinary ERC-20 contracts representing equities/ETFs; "standard token functions behave as they do for other tokens." No confirmed detail in this pass on oracle semantics, corporate-action handling, or transfer restrictions (brief §55's open questions remain genuinely open).
- **Uniswap v4 on Robinhood Chain:** **not found** in this research pass. There is no confirmed official v4 deployment (PoolManager address, etc.) on Robinhood Chain mainnet or testnet. This is the critical blocker: **Eclipse cannot deploy `EclipseHook` anywhere that doesn't have Uniswap v4 live**, and that is not yet confirmed to include Robinhood Chain.

## 3. Testnet recommendation — the actual decision

**Build and demo the Phase 1 transparent-batch prototype on a public Ethereum testnet with a confirmed official Uniswap v4 deployment, not on Robinhood Chain, until Robinhood Chain's own v4 availability is confirmed.**

Per the official Uniswap v4 deployments reference ([developers.uniswap.org/docs/protocols/v4/deployments](https://developers.uniswap.org/docs/protocols/v4/deployments)), four testnets currently have confirmed v4 core deployments:

| Testnet | Chain ID | PoolManager (v4-core) |
|---|---|---|
| **Sepolia** | `11155111` | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| **Unichain Sepolia** | `1301` | `0x00b036b58a818b1bc34d502d3fe730db729e62ac` |
| **Base Sepolia** | `84532` | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |
| **Arbitrum Sepolia** | `421614` | `0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317` |

*(Addresses pulled directly from Uniswap's official deployments page at research time; the same page explicitly warns addresses are **not** consistent across chains and may change — re-pull before writing deploy scripts, don't hardcode from this doc.)*

**Recommended pick: Unichain Sepolia.** Reasoning:
- Unichain is Uniswap Labs' own L2, purpose-built around v4 — it gets v4 feature support and tooling attention first, and is the chain most likely to stay current as v4 periphery tooling evolves.
- It is also architecturally closer to Robinhood Chain's own profile (both are rollups prioritizing low latency) than Ethereum L1 Sepolia is, so lessons about hook gas cost and confirmation timing transfer more directly to the eventual Robinhood Chain target.
- Sepolia (L1) is the safe fallback if Unichain Sepolia has liquidity/tooling gaps for a specific test (e.g. a block explorer feature); Base Sepolia / Arbitrum Sepolia are viable alternates with no particular advantage for this use case.

**What changes when Robinhood Chain testnet access and v4 deployment are confirmed:** re-run this document's §2 research against `docs.chain.robinhood.com` directly, confirm a v4 `PoolManager` address exists there, and only then port `EclipseHookV1` to Robinhood Chain testnet as a second deployment target — not a replacement for the Sepolia-family testnet work, since WETH/USDG (market #1 above) has no dependency on Robinhood Chain at all and should keep running wherever v4 already lives.

## 4. Open items

- Confirm current Robinhood Chain testnet RPC access policy (public vs. partner-gated) directly from `docs.chain.robinhood.com` before Phase 8 planning.
- Confirm whether/when Uniswap v4 is deployed on Robinhood Chain — this is the hard blocker for the brief's own stated "Target chain" and should be tracked as a standing risk in `THREAT_MODEL.md`'s "main risks" list (brief §72: "Stock Token restrictions").
- Re-verify the four testnet addresses above immediately before any deploy script is written — Uniswap's own docs warn they can change.
