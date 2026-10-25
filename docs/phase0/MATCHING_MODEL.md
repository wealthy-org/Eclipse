# Matching Model (Phase 0 Research)

**Status:** Research draft, not economically modeled against real volume yet (brief §15 explicitly says: "Do not finalize until economics are modeled"). This document picks a **default for the Phase 1 transparent prototype only**, so engineering can proceed; it is not a mainnet commitment.

---

## 1. Matching price policy — decision

Brief §15/§44 lists four candidates:

- **A.** Uniswap execution price reference
- **B.** Midpoint from oracle / external reference
- **C.** Batch clearing price
- **D.** VWAP from external execution

**Decision for Phase 1: A — Uniswap execution price reference**, specifically: matched (internal) volume clears at the **pool's current mid-price at wave lock time**, and the net remainder pays the pool's own constant-product price impact, pro-rata across participants on the net side. This is exactly what the already-built landing-page demo simulates (`cpmm()` in the terminal), so Phase 1 engineering has a working reference implementation to port from day one.

**Why A over B/C/D for Phase 1:**
- **B (oracle midpoint)** introduces an external dependency (oracle contract, staleness risk, manipulation surface) before the core accounting is even proven. Brief §61 explicitly says not to build dependencies beyond what V1 needs.
- **C (batch clearing price)** is a reasonable *target* for Phase 2+ once there's real order flow to clear against, but it requires a price-discovery mechanism of its own (an auction), which is new design surface Phase 1 doesn't need.
- **D (VWAP from external execution)** needs an external execution venue or time-series to average over — doesn't exist yet for a brand-new protocol with no volume.
- **A** needs nothing new: Uniswap v4 already *is* the price oracle for this design (brief §6: "Uniswap v4 remains the liquidity engine... provides market pricing"). Using its own spot price avoids inventing a second price source that could diverge from the pool and create arbitrage/front-run surface (brief §15's explicit warning: "avoid matcher choosing arbitrary prices").

**Revisit at Phase 2+:** once there is real gross volume per wave, model whether clearing internally-matched volume at a price *strictly inside* the pool's bid/ask (C-style) captures more value for both sides than pegging to pool mid — this is an economics question the brief defers, not an engineering one.

## 2. Netting formula

Per wave, every order is `{side: buy|sell, amountIn}` where `buy` orders are denominated in the quote asset (e.g. USDG) and `sell` orders in the base asset (e.g. WETH). Let:

```
B  = sum of all buy order amounts (quote asset)
S  = sum of all sell order amounts (base asset)
M  = pool mid price (quote per base) at wave lock
SV = S × M                    // sell volume, converted to quote terms
matched = min(B, SV)          // internally matched value, quote terms
```

**Net imbalance** (brief §14/§45, invariant `BUY − SELL = NET`):

```
if B ≥ SV:
    net side  = BUY
    net amountIn (quote)  = B − SV
    net amountOut (base)  = cpmm(B − SV, quote→base)   // pool fills this leg
else:
    net side  = SELL
    net amountIn (base)   = (SV − B) / M
    net amountOut (quote) = cpmm((SV−B)/M, base→quote)
```

Where `cpmm(amountIn, …)` is the standard constant-product-minus-fee formula the pool itself uses — Eclipse does not reimplement AMM math (brief §6), it only computes *what to ask the pool for*.

**Worked example** (matches brief §45):

```
BUY   = $130,000
SELL  = $90,000
MATCH = $90,000          (= min(130k, 90k))
NET   = $40,000 BUY      (= 130k − 90k)
```

**Netting efficiency** (brief §34, public metric):

```
netting_efficiency = 2 × matched / (B + SV)
```
(the `2×` accounts for matched volume existing on both sides of the trade — this matches the worked example in brief §34: $80K matched / $100K gross → the brief's simpler single-sided formula `matched / gross` is equivalent when `B + SV = gross`; this doc uses the same convention already implemented in the Phase 1 landing-page demo's `settle()` function so Phase 1 code and this doc stay numerically identical.)

## 3. Pro-rata partial fill (brief §16)

If the net leg cannot be fully executed (price limit hit, pool liquidity insufficient, or some orders are dropped by slippage checks — see §4), each remaining order on the net-exposed side is filled proportionally:

```
userFill = userRequested × totalFilled / totalRequested
```

**Worked example:** net side requests $100,000 total; only $70,000 of pool depth is available at an acceptable price → every order on that side receives exactly 70% of its requested amount. A $10,000 order gets $7,000 filled, a $1,000 order gets $700 filled — deterministic, no operator discretion (brief §14: "must be deterministic. No operator discretion").

Orders that were **internally matched** (the `matched` amount, both sides) are not subject to pro-rata reduction — they already fully offset each other inside the wave and never touch the pool, so there is nothing external that can partially fail them.

## 4. Slippage enforcement and re-netting (brief §17)

Every order carries `minAmountOut` (or an equivalent max-price bound). Enforcement sequence:

```
1. Compute wave net + pro-rata fills as above.
2. For each order, compute the amount it would actually receive.
3. If any order's actual receive < its minAmountOut:
     - Remove that order from the wave.
     - Recompute B, S, matched, net from the remaining orders.
     - Re-derive the settlement plan (Phase 1: deterministic recompute;
       Phase 4: this step must be re-proved under ZK, since removing an
       order changes the public statement being proven).
     - Repeat from step 2 until no order violates its own minimum,
       or the wave is empty (→ wave state FAILED, all orders refunded).
4. Only the final, slippage-clean plan executes against the pool.
```

This is exactly the flow the Phase 1 landing-page demo already demonstrates (brief §38: "Try 0.1% slippage on a large order"). The open engineering question for Phase 3+ is **where this loop terminates under adversarial order sets** — brief §58's required test suite ("slippage", "invalid proof", "wave failure") should include a test with every order simultaneously violating its minimum, to confirm the loop terminates in `FAILED` rather than looping or reverting ungracefully.

## 5. Settlement invariants (brief §46/§47) — as equations

```
total_user_inputs = internal_matched_inputs + external_execution_inputs + fees + refunds
total_outputs_credited = actual_outputs_received_from_pool + internally_matched_outputs
```

No synthetic balance creation: the sum of everything credited to users must equal (internally matched value) + (what the pool actually returned) − (protocol fee), never more. Replay protection (brief §47): a `waveId` can be marked `SETTLED` exactly once; an `orderId` can be marked `CONSUMED` exactly once — both are simple one-way state flags, not reversible by admin (brief §49: "Admin cannot: change a settled wave").

## 6. What Phase 1 explicitly does NOT need yet

Per brief §20 (MVP Strategy) and §61: no ZK proof of any of the above (Phase 4), no encrypted order payload (Phase 2), no solver competition (brief §30 — "do not add solver competition before core accounting is stable"). Phase 1's job is only to prove this arithmetic is correct and reconciles exactly, with everything visible, against real Uniswap v4 testnet liquidity.
