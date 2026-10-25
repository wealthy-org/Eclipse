# EclipseHook — Hook Design (Phase 0 Research)

**Status:** Research draft. Nothing here is deployed. Parameters are illustrative until Phase 3 implementation and audit.
**Depends on:** Uniswap v4 core (`v4-core`), specifically `Hooks.sol`, `PoolManager.sol`, `BalanceDelta`.
**Sources:** [docs.uniswap.org/contracts/v4/reference/core/libraries/Hooks](https://docs.uniswap.org/contracts/v4/reference/core/libraries/Hooks), [docs.uniswap.org/contracts/v4/concepts/hooks](https://docs.uniswap.org/contracts/v4/concepts/hooks), [Cyfrin Updraft — Encode Hook Flags](https://updraft.cyfrin.io/courses/uniswap-v4/hooks/encode-hook-flags), [Trail of Bits — Building secure Uniswap v4 hooks](https://blog.trailofbits.com/2026/07/30/building-secure-uniswap-v4-hooks/), [CertiK — Uniswap V4 Hooks Security Considerations](https://www.certik.com/blog/uniswap-v4-hooks-security-considerations).

---

## 1. How v4 hook permissions actually work

This is the part most third-party tutorials get wrong (we found two contradictory bit tables while researching this doc — see note below), so it is worth stating precisely:

- A v4 hook's permissions are **not** stored in contract state. They are read directly from the **low 14 bits of the hook contract's deployed address**.
- `Hooks.sol` defines `ALL_HOOK_MASK = uint160((1 << 14) - 1)` and one flag constant per lifecycle callback, combined with bitwise OR.
- Per the official Uniswap reference, the flags EclipseHook cares about are:
  - `BEFORE_SWAP_FLAG = 1 << 7`
  - `AFTER_SWAP_FLAG = 1 << 6`
  - `BEFORE_SWAP_RETURNS_DELTA_FLAG = 1 << 3`
  - `BEFORE_INITIALIZE_FLAG` is also in the low-bit range (exact shift to be re-verified against the on-chain `Hooks.sol` the engineer actually links against before writing `getHookPermissions()` — do not trust a secondary tutorial).
- Because the flags live in the *address*, deploying to a conforming address requires **CREATE2 salt mining**: the deployer brute-forces a salt so that `keccak256(deployer, salt, initcode)` produces an address whose low 14 bits equal the desired permission bitmap. Foundry's `HookMiner` (used throughout the v4-template and v4-periphery test suites) does exactly this — it is the de facto standard tool and EclipseHook's deploy script should reuse it rather than writing a custom miner.
- Permissions are **immutable once deployed** — there is no setter. This is why versioning (§5) matters more than upgradeability for this contract.

**Open item:** pin the exact bit-shift table to the specific `v4-core` release tag EclipseHook will build against (e.g. by copying the real `Hooks.sol` into the repo as a dependency and asserting the constants in a unit test) before writing `getHookPermissions()`. Do not hand-copy values from a blog post.

## 2. Permission set EclipseHook enables

Per brief §5.5/§7/§48/§51, the hook exists to **enforce trust-minimized execution policy**, not for branding. That means it only needs to see swaps, not liquidity changes.

| Flag | Enabled? | Why |
|---|---|---|
| `beforeInitialize` | **Yes** | Only allow pool creation through the Eclipse pool registry — rejects pools that weren't registered for the dark path, per brief §51/§7. |
| `beforeSwap` | **Yes** | This is the enforcement gate (§3 below). Every swap, public or dark, passes through it; on the public path it must return near-instantly with no extra state reads. |
| `afterSwap` | **Yes** | Captures the *actual* executed delta, marks the wave `EXECUTED`, emits the data the public proof page reads (brief §32/§39). |
| `afterSwapReturnDelta` | **Yes** | Lets the hook take the Eclipse protocol fee directly out of the swap output via `BalanceDelta`, instead of a separate token transfer call — cheaper and avoids a second external call surface. |
| `beforeSwapReturnDelta` | No (Phase 1) | Not needed until a solver-competition model (Phase 7+) wants to adjust the input amount before the core swap runs. Revisit then. |
| `beforeAddLiquidity` / `afterAddLiquidity` / `beforeRemoveLiquidity` / `afterRemoveLiquidity` | **No** | Brief §5.5/§51: "LPs use the pool exactly like any v4 pool." Eclipse must never touch LP positions — this is what keeps it from becoming "a separate AMM" (brief §2). |
| `beforeDonate` / `afterDonate` | No | No donate-based mechanism in this design. |
| `afterInitialize` | No | `beforeInitialize` is sufficient to gate pool registration; nothing needs to run *after* initialization succeeds. |

This yields a 4-flag hook: `beforeInitialize | beforeSwap | afterSwap | afterSwapReturnDelta`. Salt-mine the deployment address for exactly these four bits — enabling any additional bit the engineer didn't intend is a live footgun (CertiK and Trail of Bits both flag "accidentally granted hook permissions" as a recurring audit finding class).

## 3. `beforeSwap` checks (brief §48)

All of these must hold, or the function reverts — a revert means **the swap never happened**, no balances moved, which keeps failure recovery simple (brief §47, §58 test list: "wave failure", "execution failure").

| # | Check | Illustrative revert |
|---|---|---|
| 1 | `msg.sender` (via `PoolManager`) resolves to the registered `EclipseExecutor` for this pool — public-path swaps (no Eclipse `hookData`) skip checks 2-6 and return immediately. | `NotEclipseExecutor()` |
| 2 | `poolId` is registered for Eclipse execution. | `PoolNotRegistered()` |
| 3 | The referenced wave is `LOCKED` and not already `SETTLED`/`EXECUTED`. | `WaveAlreadySettled(waveId)` |
| 4 | The commitment/settlement root passed in `hookData` matches the root the `EclipseWaveManager` locked on-chain for that wave. | `RootMismatch()` |
| 5 | The swap amount passed to `PoolManager.swap()` equals the proven net imbalance for that wave (not an arbitrary amount the executor could pick). | `AmountMismatch(expected, got)` |
| 6 | The execution deadline for the wave has not passed. | `DeadlineExpired()` |

Hook security ground rules carried over from the brief (§48) and corroborated by the Trail of Bits / CertiK hook-security writeups: never trust `hookData` contents without checking them against state the hook already holds; no arbitrary external calls from inside the hook; no unbounded loops (all per-wave aggregation happens off-chain in the matcher — the hook only checks a single scalar `AmountMismatch`, it never iterates per-order); no delegatecall-based upgrade path.

## 4. `afterSwap` accounting (brief §5.5, §32)

On the Eclipse (dark) path only — detected by non-empty Eclipse `hookData`, exactly mirroring the `beforeSwap` gate so public swaps pay zero extra gas for this logic:

1. Read the actual `BalanceDelta` the core swap produced (this is the *real* fill, which can differ slightly from the proven estimate due to in-flight pool price movement between proving and execution — this gap is exactly why brief §17 requires slippage protection per order).
2. Mark the wave `EXECUTED`, store the delta as the wave's settlement reference.
3. Compute the Eclipse protocol fee from the delta (illustrative: 5 bps, brief §28) and return it via `afterSwapReturnDelta` so `PoolManager` nets it out of the swap output atomically.
4. Emit `EclipseWaveExecuted(waveId, delta, commitmentRoot)` — this event **is** the public proof-of-execution data the `/wave/[id]` page reads (brief §32/§39). No additional off-chain index is required for the core proof, only for UX enrichment (participant count, netting efficiency — those come from the matcher's settlement plan, not from the chain).

## 5. Versioning instead of upgradeability (brief §51)

Per brief §51, prefer **versioned deployments** (`EclipseHookV1`, `EclipseHookV2`, …) over a single mutable hook with admin-swappable logic:

- Each version is its own immutable contract at its own mined address. A pool initialized with `EclipseHookV1` keeps that hook for its lifetime — v4 pools have exactly one hook, fixed at `initialize()` (brief §23).
- New pools / new integrations opt into a newer version going forward; existing pools are not silently migrated.
- If upgradeability is ever required (e.g. a verifier-version registry inside the hook), it must be gated by **multisig + timelock + public notice** (brief §51), never a bare `onlyOwner` setter — this is the direct implementation of the Admin Architecture constraints in brief §49 ("Admin cannot: change a settled wave, forge a valid proof, redirect user output").

## 6. Pools that already run a different hook (brief §23/§24)

A v4 pool has exactly one hook, chosen at `initialize()` and fixed forever. A pool that already runs another hook (e.g. a graduated Pons bonding-curve pool with its own fee/burn hook) **cannot** retroactively add EclipseHook.

For those pools, Phase 8 uses an **executor-only route**: `EclipseExecutor` performs the same six `beforeSwap`-equivalent checks itself, in its own contract logic, before calling `PoolManager.swap()` against the pool's existing hook. The existing hook is untouched and still runs its own logic normally. The trade-off, stated plainly: enforcement now lives in the executor contract rather than being mechanically forced by the pool's hook slot — it is a weaker trust boundary than native EclipseHook enforcement, and this difference should be disclosed on `/privacy`, not glossed over. V1 scope (brief §23): graduated Pons tokens only, never the pre-graduation bonding curve.

## 7. Open items for Phase 3 (not decided here)

- Exact bit-shift constants, re-verified against the pinned `v4-core` version (§1).
- Whether `beforeSwapReturnDelta` is needed once solver competition (brief §30) arrives.
- Exact `EclipseWaveManager` ↔ `EclipseHook` state-reference pattern (storage pointer vs. calldata-passed root) — affects gas and is a Phase 3 implementation decision, not a Phase 0 one.
