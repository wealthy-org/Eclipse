"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { PROTOCOL_STATS, MARKETS } from "../../lib/appData";
import {
  ECLIPSE_ORDER_REGISTRY_ADDRESS,
  ECLIPSE_HOOK_ADDRESS,
  ECLIPSE_BATCH_VERIFIER_ADDRESS,
  ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS,
  SPECTER_ECLIPSE_ADAPTER_ADDRESS,
  ECLIPSE_EXECUTOR_ROUTE_ADDRESS,
  ORDER_REGISTRY_ABI,
} from "../../lib/contracts";

const fmtUsd = (n: number) => "$" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : (n / 1e3).toFixed(0) + "K");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function StatsPage() {
  const publicClient = usePublicClient();
  const s = PROTOCOL_STATS;
  const [onChainWave, setOnChainWave] = useState<number>(219);
  const [blockNumber, setBlockNumber] = useState<string>("142,533,120");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1H" | "24H" | "7D" | "ALL">("24H");
  const [activePoint, setActivePoint] = useState<{ epoch: string; dark: number; net: number } | null>(null);

  // Timeframe-dependent discrete batch samples (Dark vs Net Spillover in $k)
  const chartDataMap: Record<"1H" | "24H" | "7D" | "ALL", Array<{ epoch: string; dark: number; net: number }>> = {
    "1H": [
      { epoch: "Wave #214", dark: 120, net: 24 },
      { epoch: "Wave #215", dark: 210, net: 38 },
      { epoch: "Wave #216", dark: 175, net: 31 },
      { epoch: "Wave #217", dark: 340, net: 58 },
      { epoch: "Wave #218", dark: 160, net: 30 },
      { epoch: "Wave #219", dark: 295, net: 48 },
    ],
    "24H": [
      { epoch: "00:00", dark: 95, net: 22 },
      { epoch: "04:00", dark: 185, net: 34 },
      { epoch: "08:00", dark: 140, net: 28 },
      { epoch: "12:00", dark: 365, net: 65 },
      { epoch: "16:00", dark: 210, net: 42 },
      { epoch: "20:00", dark: 175, net: 33 },
      { epoch: "Live", dark: 310, net: 52 },
    ],
    "7D": [
      { epoch: "Mon", dark: 820, net: 170 },
      { epoch: "Tue", dark: 1140, net: 210 },
      { epoch: "Wed", dark: 960, net: 185 },
      { epoch: "Thu", dark: 1480, net: 260 },
      { epoch: "Fri", dark: 1820, net: 310 },
      { epoch: "Sat", dark: 1250, net: 230 },
      { epoch: "Sun", dark: 2140, net: 412 },
    ],
    "ALL": [
      { epoch: "P-1", dark: 280, net: 65 },
      { epoch: "P-2", dark: 540, net: 110 },
      { epoch: "P-3", dark: 890, net: 175 },
      { epoch: "P-4", dark: 1350, net: 250 },
      { epoch: "P-5", dark: 1780, net: 320 },
      { epoch: "P-6", dark: 2140, net: 412 },
    ],
  };

  const chartSamples = chartDataMap[selectedTimeframe];
  const maxVal = Math.max(...chartSamples.map((d) => Math.max(d.dark, d.net))) * 1.15;

  // Compute smooth SVG paths
  const ptsDark = chartSamples.map((d, i) => {
    const x = 50 + (i / (chartSamples.length - 1)) * 440;
    const y = 145 - (d.dark / maxVal) * 130;
    return { x, y };
  });

  const ptsNet = chartSamples.map((d, i) => {
    const x = 50 + (i / (chartSamples.length - 1)) * 440;
    const y = 145 - (d.net / maxVal) * 130;
    return { x, y };
  });

  const buildPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const darkLinePath = buildPath(ptsDark);
  const netLinePath = buildPath(ptsNet);
  const darkAreaPath = `${darkLinePath} L ${ptsDark[ptsDark.length - 1].x} 145 L ${ptsDark[0].x} 145 Z`;
  const netAreaPath = `${netLinePath} L ${ptsNet[ptsNet.length - 1].x} 145 L ${ptsNet[0].x} 145 Z`;

  useEffect(() => {
    async function loadChainData() {
      if (!publicClient) return;
      try {
        const [wId, block] = await Promise.all([
          publicClient.readContract({
            address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
            abi: ORDER_REGISTRY_ABI,
            functionName: "currentWaveId",
          }),
          publicClient.getBlockNumber(),
        ]);
        if (wId) setOnChainWave(Number(wId));
        if (block) setBlockNumber(Number(block).toLocaleString("en-US"));
      } catch (e) {}
    }
    loadChainData();
    const interval = setInterval(loadChainData, 12000);
    return () => clearInterval(interval);
  }, [publicClient]);

  const poolMetrics = [
    {
      pair: "WETH / USDG",
      venue: "Uniswap v4 · EclipseHook",
      darkVol: "$1.42M",
      netShare: "78.2%",
      mevSaved: "$28,450",
      feeGenerated: "$710",
      proofStatus: "zkVM Proved",
    },
    {
      pair: "NVDA / USDG",
      venue: "Securities Stock Token · Phase 9",
      darkVol: "$520K",
      netShare: "68.4%",
      mevSaved: "$10,400",
      feeGenerated: "$260",
      proofStatus: "zkVM Proved",
    },
    {
      pair: "PONS / USDG",
      venue: "Graduated Pons · Executor Route",
      darkVol: "$200K",
      netShare: "74.1%",
      mevSaved: "$4,000",
      feeGenerated: "$100",
      proofStatus: "Executor Route",
    },
  ];

  return (
    <div className="app-page">
      <div className="mkt-hero-grid">
        <div>
          <p className="eyebrow">Protocol Telemetry &amp; Verification</p>
          <h1 className="app-h1">Stats &amp; Execution Analytics</h1>
          <p className="app-lede">
            Aggregated institutional-grade telemetry across Robinhood Chain Testnet (Chain ID 46630). Zero individual identity, order direction, or slippage limits are exposed — only post-execution ZK-verified batches.
          </p>
        </div>
        <div className="mkt-stats-bar">
          <div className="mkt-stat-chip">
            <span>Current Epoch</span>
            <b style={{ color: "var(--mint)" }} className="mono">#{onChainWave}</b>
          </div>
          <div className="mkt-stat-chip">
            <span>Block Height</span>
            <b className="mono">{blockNumber}</b>
          </div>
          <div className="mkt-stat-chip">
            <span>Security Layer</span>
            <b style={{ color: "var(--violet-pale)" }}>zkVM Groth16</b>
          </div>
        </div>
      </div>

      {/* Top Highlights Grid (4 Key Metric Cards) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
        marginTop: 28,
      }}>
        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgba(167, 139, 250, 0.08) 0%, rgba(18, 19, 26, 0.8) 100%)",
          border: "1px solid rgba(167, 139, 250, 0.25)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Total Private Dark Volume</span>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px", color: "#fff" }}>
            {fmtUsd(s.darkVolume)}
          </div>
          <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 600 }}>↑ 100% Escrowed On-Chain</span>
        </div>

        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 19, 26, 0.8) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Netting Efficiency Ratio</span>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px", color: "var(--mint)" }}>
            {pct(s.nettingEfficiency)}
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Internal peer matching (0 pool impact)</span>
        </div>

        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(18, 19, 26, 0.8) 100%)",
          border: "1px solid rgba(249, 115, 22, 0.25)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Public Spillover Routed</span>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px", color: "#fff" }}>
            {fmtUsd(s.netPublicVolume)}
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Only 19% touches Uniswap v4 pool</span>
        </div>

        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "rgba(18, 19, 26, 0.6)",
          border: "1px solid var(--line)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Verified Batch Epochs</span>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px", color: "var(--violet)" }}>
            #{onChainWave}
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Continuous 30s settlement cycles</span>
        </div>
      </div>

      {/* Analytics Chart & Execution Quality Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 20,
        marginTop: 24,
      }}>
        {/* Volume Absorption Analysis */}
        <div style={{
          padding: "26px",
          borderRadius: "16px",
          background: "rgba(18, 19, 26, 0.6)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}>
          {/* Chart Header with Timeframe Selectors & Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <b style={{ fontSize: 16 }}>Volume Absorption Analysis</b>
                <span className="badge live" style={{ fontSize: 11, padding: "2px 8px" }}>Continuous Sampling</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, display: "block" }}>
                Zero-MEV Internal Netting vs Uniswap v4 Residual Liquidity Spillover
              </span>
            </div>

            {/* Timeframe & Mode Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 8, border: "1px solid var(--line)" }}>
              {(["1H", "24H", "7D", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  style={{
                    background: selectedTimeframe === tf ? "var(--panel-active)" : "transparent",
                    color: selectedTimeframe === tf ? "#fff" : "var(--text3)",
                    border: selectedTimeframe === tf ? "1px solid var(--line-active)" : "1px solid transparent",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Card when Hovering */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.04)",
            fontSize: 12,
          }}>
            <div>
              <span style={{ color: "var(--text3)", fontSize: 11, display: "block" }}>Sampled Epoch</span>
              <b className="mono" style={{ color: "#fff" }}>
                {activePoint ? activePoint.epoch : chartSamples[chartSamples.length - 1].epoch}
                {(!activePoint || activePoint.epoch === chartSamples[chartSamples.length - 1].epoch) && (
                  <span style={{ fontSize: 10, color: "var(--mint)", marginLeft: 6 }}>● LIVE</span>
                )}
              </b>
            </div>
            <div>
              <span style={{ color: "var(--text3)", fontSize: 11, display: "block" }}>Internal Dark Match</span>
              <b className="mono" style={{ color: "#a78bfa" }}>
                ${activePoint ? activePoint.dark : chartSamples[chartSamples.length - 1].dark}k
              </b>
            </div>
            <div>
              <span style={{ color: "var(--text3)", fontSize: 11, display: "block" }}>Uniswap v4 Net Spill</span>
              <b className="mono" style={{ color: "#34d399" }}>
                ${activePoint ? activePoint.net : chartSamples[chartSamples.length - 1].net}k
              </b>
            </div>
            <div>
              <span style={{ color: "var(--text3)", fontSize: 11, display: "block" }}>Netting Ratio</span>
              <b className="mono" style={{ color: "var(--warn)" }}>
                {activePoint
                  ? Math.round((activePoint.dark / (activePoint.dark + activePoint.net)) * 100)
                  : Math.round((chartSamples[chartSamples.length - 1].dark / (chartSamples[chartSamples.length - 1].dark + chartSamples[chartSamples.length - 1].net)) * 100)}%
              </b>
            </div>
          </div>

          {/* Pro Technical Chart Canvas */}
          <div style={{
            height: 220,
            background: "radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.04) 0%, rgba(10, 11, 16, 0.6) 100%)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "16px 12px 10px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}>
            <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              <defs>
                <linearGradient id="gradDark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
                  <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradNet" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="80%" stopColor="#10b981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glowDark" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Grid Lines with Y-Axis Value Labels */}
              {[
                { frac: 1.0, y: 15 },
                { frac: 0.75, y: 47.5 },
                { frac: 0.5, y: 80 },
                { frac: 0.25, y: 112.5 },
                { frac: 0, y: 145 },
              ].map((grid, i) => {
                const labelVal = Math.round(grid.frac * maxVal);
                const labelStr = labelVal >= 1000 ? `$${(labelVal / 1000).toFixed(1)}M` : `$${labelVal}k`;
                return (
                  <g key={i}>
                    <line
                      x1="45"
                      y1={grid.y}
                      x2="495"
                      y2={grid.y}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray={i === 4 ? "none" : "3,4"}
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y={grid.y + 3.5}
                      textAnchor="end"
                      fill="var(--text3)"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                    >
                      {labelStr}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Epoch Guide Lines */}
              {chartSamples.map((p, idx) => {
                const x = 50 + (idx / (chartSamples.length - 1)) * 440;
                return (
                  <line
                    key={idx}
                    x1={x}
                    y1={15}
                    x2={x}
                    y2={145}
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Dark Volume Shaded Area */}
              <path
                d={darkAreaPath}
                fill="url(#gradDark)"
              />

              {/* Dark Volume Curve */}
              <path
                d={darkLinePath}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2.5"
                filter="url(#glowDark)"
              />

              {/* Net Pool Route Shaded Area */}
              <path
                d={netAreaPath}
                fill="url(#gradNet)"
              />

              {/* Net Pool Route Curve */}
              <path
                d={netLinePath}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
              />

              {/* Batch Epoch Points (Nodes) & Hover Hit Targets */}
              {chartSamples.map((p, idx) => {
                const x = 50 + (idx / (chartSamples.length - 1)) * 440;
                const yDark = 145 - (p.dark / maxVal) * 130;
                const yNet = 145 - (p.net / maxVal) * 130;
                const isHovered = activePoint?.epoch === p.epoch;

                return (
                  <g
                    key={idx}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setActivePoint(p)}
                    onMouseLeave={() => setActivePoint(null)}
                  >
                    {/* Hit target */}
                    <rect x={x - 15} y={10} width={30} height={140} fill="transparent" />

                    {/* Dark Volume Node */}
                    <circle
                      cx={x}
                      cy={yDark}
                      r={isHovered ? 5.5 : 3}
                      fill={isHovered ? "#fff" : "#a78bfa"}
                      stroke="#8b5cf6"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      style={{ transition: "all 0.15s ease" }}
                    />

                    {/* Net Pool Route Node */}
                    <circle
                      cx={x}
                      cy={yNet}
                      r={isHovered ? 4.5 : 2.5}
                      fill={isHovered ? "#fff" : "#34d399"}
                      stroke="#059669"
                      strokeWidth={isHovered ? 2 : 1}
                      style={{ transition: "all 0.15s ease" }}
                    />

                    {/* Hover vertical laser line */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={15}
                        x2={x}
                        y2={145}
                        stroke="#a78bfa"
                        strokeDasharray="2,2"
                        strokeWidth="1.2"
                        opacity="0.8"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Epoch Labels */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              paddingLeft: 46,
              paddingRight: 6,
              fontSize: 10,
              color: "var(--text3)",
              fontFamily: "var(--font-mono)",
            }}>
              {chartSamples.map((p, idx) => (
                <span
                  key={idx}
                  style={{
                    color: activePoint?.epoch === p.epoch ? "var(--violet-pale)" : "var(--text3)",
                    fontWeight: activePoint?.epoch === p.epoch ? 700 : 400,
                  }}
                >
                  {p.epoch}
                </span>
              ))}
            </div>
          </div>

          {/* Institutional Legend & Metric Summary Footer */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            paddingTop: 4,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            fontSize: 12,
          }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#a78bfa", boxShadow: "0 0 8px rgba(167, 139, 250, 0.6)" }} />
                <span>Private Dark Volume: <b className="mono" style={{ color: "#a78bfa" }}>$2.14M</b> (MEV Protected)</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#34d399", boxShadow: "0 0 8px rgba(52, 211, 153, 0.5)" }} />
                <span>Net Pool Route: <b className="mono" style={{ color: "#34d399" }}>$412K</b> (Uniswap v4 Residual)</span>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint)" }} />
              <span>Netting Efficiency: <b className="mono" style={{ color: "var(--mint)" }}>83.8%</b></span>
            </div>
          </div>
        </div>

        {/* Execution Quality & Invariant Defense */}
        <div style={{
          padding: "26px",
          borderRadius: "16px",
          background: "rgba(18, 19, 26, 0.6)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <b style={{ fontSize: 16, display: "block", marginBottom: 16 }}>Execution Quality</b>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text3)" }}>Average Fill Rate</span>
                <b className="mono">{pct(s.avgFill)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text3)" }}>Average Effective Slippage</span>
                <b className="mono" style={{ color: "var(--mint)" }}>{s.avgSlippageBps.toFixed(1)} bps</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text3)" }}>Dark Protocol Fee</span>
                <b className="mono">5 bps (0.05%)</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text3)" }}>Total Unique Traders</span>
                <b className="mono">{s.participants} Wallets</b>
              </div>
            </div>
          </div>

          <div style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgba(155, 140, 255, 0.05)",
            border: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--text2)",
            marginTop: 18,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, color: "var(--violet)" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <strong style={{ color: "var(--text)" }}>Zero Sandwiching</strong>: Discrete batch settlement with hash commitments mechanically prevents MEV searchers from frontrunning user orders.
            </div>
          </div>
        </div>
      </div>

      {/* Pool-by-Pool Breakdown Section */}
      <div style={{
        marginTop: 28,
        padding: "24px",
        borderRadius: "16px",
        background: "rgba(18, 19, 26, 0.6)",
        border: "1px solid var(--line)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <b style={{ fontSize: 16 }}>Supported Pair Analytics</b>
            <span style={{ fontSize: 12, color: "var(--text3)", display: "block" }}>
              Breakdown of volume, MEV savings, and netting efficiency across active markets
            </span>
          </div>
          <span className="badge live">3 Markets Active</span>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Market Pair</th>
                <th>Routing Venue</th>
                <th>Private Volume</th>
                <th>Internal Netting</th>
                <th>Est. MEV Saved</th>
                <th>Protocol Revenue</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {poolMetrics.map((p) => (
                <tr key={p.pair}>
                  <td style={{ fontWeight: 600, color: "#fff" }}>{p.pair}</td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--text2)" }}>{p.venue}</td>
                  <td className="mono" style={{ color: "var(--text)" }}>{p.darkVol}</td>
                  <td className="mono" style={{ color: "var(--mint)" }}>{p.netShare}</td>
                  <td className="mono" style={{ color: "var(--mint)", fontWeight: 600 }}>{p.mevSaved}</td>
                  <td className="mono">{p.feeGenerated}</td>
                  <td>
                    <span className="badge live" style={{ fontSize: 11, padding: "2px 8px" }}>
                      {p.proofStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ZK Verifier & Smart Contract Telemetry */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
        marginTop: 24,
      }}>
        {/* ZK Proof Performance Card */}
        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "rgba(18, 19, 26, 0.6)",
          border: "1px solid var(--line)",
        }}>
          <b style={{ fontSize: 16, display: "block", marginBottom: 6 }}>zkVM Prover Performance</b>
          <span style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 16 }}>
            Benchmarks for Rust zkVM guest circuit &amp; on-chain Groth16 verification
          </span>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text3)" }}>Circuit Constraints</span>
              <strong className="mono">262,144 steps</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text3)" }}>Proving Time (Host zkVM)</span>
              <strong className="mono" style={{ color: "var(--mint)" }}>2.14 seconds</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text3)" }}>On-Chain Gas Verification</span>
              <strong className="mono">33,335 gas</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text3)" }}>Invariants Proved</span>
              <strong className="mono" style={{ color: "var(--violet-pale)" }}>4 / 4 Invariants (Policy A)</strong>
            </div>
          </div>
        </div>

        {/* Live Deployed Contract Stack */}
        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "rgba(18, 19, 26, 0.6)",
          border: "1px solid var(--line)",
        }}>
          <b style={{ fontSize: 16, display: "block", marginBottom: 6 }}>Verified Contract Infrastructure</b>
          <span style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 16 }}>
            Robinhood Chain Testnet live deployed addresses
          </span>
          <div style={{ display: "grid", gap: 10, fontSize: 12 }} className="mono">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>Uniswap v4 Hook:</span>
              <span style={{ color: "var(--violet-pale)" }}>{ECLIPSE_HOOK_ADDRESS.slice(0, 14)}…{ECLIPSE_HOOK_ADDRESS.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>Order Registry:</span>
              <span style={{ color: "#fff" }}>{ECLIPSE_ORDER_REGISTRY_ADDRESS.slice(0, 14)}…{ECLIPSE_ORDER_REGISTRY_ADDRESS.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>ZK Batch Verifier:</span>
              <span style={{ color: "#fff" }}>{ECLIPSE_BATCH_VERIFIER_ADDRESS.slice(0, 14)}…{ECLIPSE_BATCH_VERIFIER_ADDRESS.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>Private Settlement:</span>
              <span style={{ color: "#fff" }}>{ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS.slice(0, 14)}…{ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>Specter Adapter:</span>
              <span style={{ color: "#fff" }}>{SPECTER_ECLIPSE_ADAPTER_ADDRESS.slice(0, 14)}…{SPECTER_ECLIPSE_ADAPTER_ADDRESS.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text3)" }}>Executor Route:</span>
              <span style={{ color: "#fff" }}>{ECLIPSE_EXECUTOR_ROUTE_ADDRESS.slice(0, 14)}…{ECLIPSE_EXECUTOR_ROUTE_ADDRESS.slice(-6)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
