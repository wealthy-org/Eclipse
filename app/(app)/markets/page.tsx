"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../lib/appData";
import AppDrawer from "../AppDrawer";
import { IcArrow } from "../icons";

const STATUS_LABEL: Record<Market["status"], string> = {
  live: "Live",
  research: "Research",
  planned: "Planned",
};

export default function MarketsPage() {
  const [active, setActive] = useState<Market | null>(null);

  return (
    <div className="app-page">
      <div className="mkt-hero-grid">
        <div>
          <p className="eyebrow">Markets</p>
          <h1 className="app-h1">Supported markets</h1>
          <p className="app-lede">
            Netting improves when orders share a wave, so Eclipse targets one to three liquid markets rather than many
            thin ones. Public swap is always available; Dark mode batches into the next Eclipse Wave.
          </p>
        </div>
        <div className="mkt-stats-bar">
          <div className="mkt-stat-chip">
            <span>Execution Model</span>
            <b>Batch Netting</b>
          </div>
          <div className="mkt-stat-chip">
            <span>Wave Cadence</span>
            <b>30–60s</b>
          </div>
          <div className="mkt-stat-chip">
            <span>Protocol Fee</span>
            <b>5 bps</b>
          </div>
        </div>
      </div>

      <div className="markets-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 28,
        marginTop: 32,
        width: "100%",
      }}>
        {MARKETS.map((m) => {
          const isLive = m.status === "live";
          const high24 = m.id === "nvda-usdg" ? "$144.10" : m.id === "pons-usdg" ? "$0.54" : "$3,210.00";
          const low24 = m.id === "nvda-usdg" ? "$136.80" : m.id === "pons-usdg" ? "$0.46" : "$3,085.50";
          const vol24 = m.id === "nvda-usdg" ? "$2.84M" : m.id === "pons-usdg" ? "$840K" : "$7.65M";
          const netEfficiency = m.id === "nvda-usdg" ? "68.4%" : m.id === "pons-usdg" ? "74.1%" : "72.8%";
          const baseReserveStr = m.pool ? `${m.pool.base.toLocaleString("en-US")} ${m.base}` : "—";

          return (
            <div
              key={m.id}
              onClick={() => setActive(m)}
              style={{
                cursor: "pointer",
                padding: "32px 28px",
                borderRadius: "18px",
                background: "var(--panel)",
                border: "1px solid rgba(155, 140, 255, 0.35)",
                boxShadow: "0 16px 40px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 520,
                transition: "all 0.25s var(--ease)",
              }}
            >
              <div>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <b style={{ fontSize: 22, letterSpacing: "-0.01em", color: "var(--text)" }}>{m.pair}</b>
                      <span className="badge live">
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text3)", display: "block", marginTop: 6 }}>
                      {m.venue}
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
                      ${m.price}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 600, display: "inline-block", marginTop: 2 }}>
                      +2.45% 24h
                    </span>
                  </div>
                </div>

                {/* 24h Price Range mini-bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--text3)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  marginTop: 14,
                  border: "1px solid var(--line)",
                }}>
                  <span>24h Range: <strong className="mono" style={{ color: "var(--text)" }}>{low24}</strong> - <strong className="mono" style={{ color: "var(--text)" }}>{high24}</strong></span>
                  <span>Vol: <strong className="mono" style={{ color: "var(--text)" }}>{vol24}</strong></span>
                </div>

                {/* Enhanced Detailed Sparkline Area */}
                <div style={{
                  height: 104,
                  width: "100%",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  margin: "18px 0",
                  position: "relative",
                  border: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)" }}>
                    <span className="mono">{high24}</span>
                    <span className="mono" style={{ color: "var(--mint)", fontSize: 10 }}>● 24h Continuous Proved Curve</span>
                  </div>
                  <svg viewBox="0 0 200 48" style={{ width: "100%", height: 48, overflow: "visible" }}>
                    <defs>
                      <linearGradient id={`gradArea-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--mint)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={
                        m.id === "nvda-usdg"
                          ? "M 0 32 Q 40 18, 90 28 T 150 14 L 200 10 L 200 48 L 0 48 Z"
                          : m.id === "pons-usdg"
                          ? "M 0 40 Q 50 35, 100 20 T 160 15 L 200 12 L 200 48 L 0 48 Z"
                          : "M 0 38 Q 30 42, 60 28 T 120 18 T 170 12 L 200 8 L 200 48 L 0 48 Z"
                      }
                      fill={`url(#gradArea-${m.id})`}
                    />
                    <path
                      d={
                        m.id === "nvda-usdg"
                          ? "M 0 32 Q 40 18, 90 28 T 150 14 L 200 10"
                          : m.id === "pons-usdg"
                          ? "M 0 40 Q 50 35, 100 20 T 160 15 L 200 12"
                          : "M 0 38 Q 30 42, 60 28 T 120 18 T 170 12 L 200 8"
                      }
                      fill="none"
                      stroke="var(--mint)"
                      strokeWidth="2.2"
                    />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)" }}>
                    <span className="mono">{low24}</span>
                    <span className="mono">Epoch #201 · 30s Wave</span>
                  </div>
                </div>

                {/* Pool & Netting Metrics Table (6 Data Points) */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  padding: "16px 0",
                  borderTop: "1px solid var(--line)",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 12,
                }}>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Pool Liquidity</span>
                    <strong className="mono" style={{ fontSize: 14, color: "var(--text)" }}>
                      ${(m.pool!.quote / 1e6).toFixed(2)}M USDG
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Base Reserves</span>
                    <strong className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                      {baseReserveStr}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Execution Route</span>
                    <strong style={{ fontSize: 13, color: "var(--violet-pale)" }}>
                      {m.id === "pons-usdg" ? "Executor Route" : "EclipseHook v4"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Netting Efficiency</span>
                    <strong className="mono" style={{ fontSize: 13, color: "var(--mint)" }}>
                      {netEfficiency}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Dark Protocol Fee</span>
                    <strong className="mono" style={{ fontSize: 13, color: "var(--text)" }}>5 bps (0.05%)</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)", display: "block", marginBottom: 3 }}>Batch Cadence</span>
                    <strong className="mono" style={{ fontSize: 13, color: "var(--text)" }}>30–60 Seconds</strong>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>{m.note}</span>
                <span style={{ fontSize: 13, color: "var(--violet)", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  Open terminal
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <AppDrawer
        open={!!active}
        onClose={() => setActive(null)}
        eyebrow="Market Specification"
        title={active?.pair ?? ""}
      >
        {active ? (
          <div className="dw-sec" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header Status Card in Drawer */}
            <div style={{
              padding: "16px 18px",
              borderRadius: "14px",
              background: "linear-gradient(180deg, rgba(167, 139, 250, 0.08) 0%, rgba(18, 19, 26, 0.8) 100%)",
              border: "1px solid rgba(167, 139, 250, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Venue &amp; Security Layer</span>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginTop: 2 }}>{active.venue}</div>
              </div>
              <span className="badge live">
                {STATUS_LABEL[active.status]}
              </span>
            </div>

            {/* Price, Liquidity, & Base Reserves 3-Col Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}>
              <div style={{ padding: "14px", borderRadius: "10px", background: "var(--bg2)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Reference Price</span>
                <div className="mono" style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
                  ${active.price}
                </div>
              </div>
              <div style={{ padding: "14px", borderRadius: "10px", background: "var(--bg2)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Pool Depth</span>
                <div className="mono" style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
                  ${(active.pool!.quote / 1e6).toFixed(2)}M
                </div>
              </div>
              <div style={{ padding: "14px", borderRadius: "10px", background: "var(--bg2)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Base Reserves</span>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
                  {active.pool ? `${active.pool.base.toLocaleString("en-US")} ${active.base}` : "—"}
                </div>
              </div>
            </div>

            {/* Deep Architecture & Verification Specs */}
            <div style={{ padding: "18px", borderRadius: "14px", background: "var(--bg2)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Protocol Execution &amp; Verification Rules</span>
              <ul style={{ display: "grid", gap: 11, marginTop: 14, fontSize: 13, color: "var(--text2)" }}>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Matching Invariant:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>Policy A (Internal Mid Cleared)</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Batch Wave Window:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>30–60 Seconds Continuous</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Dark Protocol Fee:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>5 bps (0.05%) flat</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Pool Fee Tier:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>5 bps Uniswap v4 Core</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>ZK Verification Circuit:</span>
                  <strong className="mono" style={{ color: "var(--mint)" }}>zkVM 4-Invariant Prover (Rust)</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Anti-Double Spend:</span>
                  <strong className="mono" style={{ color: "var(--mint)" }}>Nullifier Hash Root Set</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Settlement Privacy:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>Merkle Inclusion Stealth Claim</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Target Chain:</span>
                  <strong className="mono" style={{ color: "var(--text)" }}>Robinhood Testnet (ID 46630)</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                  <span>On-Chain Verified Hook:</span>
                  <strong className="mono" style={{ color: "var(--violet-pale)" }}>
                    {active.id === "pons-usdg" ? "0xbBB7...3265 (EclipseExecutorRoute)" : "0x47c6...60c4 (EclipseHook)"}
                  </strong>
                </li>
              </ul>
            </div>

            {/* Smart Contract Mapping Details in Drawer */}
            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Deployed Contract Stack</span>
              <div style={{ display: "grid", gap: 8, marginTop: 10, fontSize: 12 }} className="mono">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>Order Registry:</span>
                  <span style={{ color: "#fff" }}>0xA697AD15EB193c7e23c4208606587c2FEfDf92ad</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>ZK Verifier:</span>
                  <span style={{ color: "#fff" }}>0x5b19C43F23DBfe73292FFC22a4147322ab90104F</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>Private Settlement:</span>
                  <span style={{ color: "#fff" }}>0xAe07dB429A0902fB7f505a296E12C254A468eA74</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>Specter Adapter:</span>
                  <span style={{ color: "#fff" }}>0xcB548BA082ADA0D4FD37E8Cea4017212d6204343</span>
                </div>
              </div>
            </div>

            <p className="app-lede" style={{ fontSize: 13, margin: 0 }}>{active.note}</p>

            <Link href={`/market/${active.id}`} className="btn btn-primary" style={{ justifyContent: "center", width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 600 }}>
              Launch Terminal
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, marginLeft: 8 }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : null}
      </AppDrawer>
    </div>
  );
}
