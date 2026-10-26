import Link from "next/link";
import { IcArrow } from "../icons";
import FaucetSandbox from "./FaucetSandbox";

const INTEGRATORS = ["Wallets", "Trading terminals", "Launchpads", "Aggregators", "Trading bots", "Portfolio managers"];

export default function IntegratePage() {
  return (
    <div className="app-page">
      <p className="eyebrow">Integrate</p>
      <h1 className="app-h1">Build on Eclipse</h1>
      <p className="app-lede">
        Eclipse is protocol infrastructure — any wallet, terminal, launchpad or aggregator should be able to submit
        orders directly, without depending on a first-party app.
      </p>

      <div className="integrate-grid" style={{ marginTop: 28 }}>
        <div className="code">
          <div className="code-bar">
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>TypeScript SDK</span>
              <span style={{ color: "var(--text3)" }}>Solidity Contract Call</span>
              <span style={{ color: "var(--text3)" }}>cURL RPC</span>
            </div>
            {/* <span className="sim">Phase 2 / 3 Active Interface</span> */}
          </div>
          <pre>
            <code>
              <span className="k">import</span> {"{ EclipseClient, parseUnits }"} <span className="k">from</span> <span className="s">&apos;@eclipse/sdk&apos;</span>{"\n\n"}
              <span className="c">{"// 1. Initialize Eclipse client for Robinhood Chain Testnet"}</span>{"\n"}
              <span className="k">const</span> eclipse = <span className="k">new</span> <span className="f">EclipseClient</span>({"{"}{"\n"}
              {"  "}chainId: <span className="m">46630</span>,{"\n"}
              {"  "}registry: <span className="s">&apos;0xA697AD15EB193c7e23c4208606587c2FEfDf92ad&apos;</span>,{"\n"}
              {"}"}){"\n\n"}
              <span className="c">{"// 2. Submit Dark Mode encrypted commitment (hides direction & limit)"}</span>{"\n"}
              <span className="k">const</span> tx = <span className="k">await</span> eclipse.<span className="f">submitCommitment</span>({"{"}{"\n"}
              {"  "}tokenIn: <span className="s">&apos;0x223F...2482&apos;</span>, <span className="c">{"// USDG"}</span>{"\n"}
              {"  "}tokenOut: <span className="s">&apos;0xb8A8...72Dc6&apos;</span>, <span className="c">{"// WETH"}</span>{"\n"}
              {"  "}amountIn: <span className="f">parseUnits</span>(<span className="s">&apos;12000&apos;</span>, <span className="m">18</span>),{"\n"}
              {"  "}minAmountOut: <span className="f">parseUnits</span>(<span className="s">&apos;3.81&apos;</span>, <span className="m">18</span>),{"\n"}
              {"  "}expiry: Date.<span className="f">now</span>() / <span className="m">1000</span> + <span className="m">3600</span>,{"\n"}
              {"}"}){"\n\n"}
              <span className="k">const</span> receipt = <span className="k">await</span> tx.<span className="f">wait</span>()
              {"\n"}<span className="c">{"// → { waveId: 201, commitment: '0x999e...9743', status: 'escrowed' }"}</span>
            </code>
          </pre>
        </div>

        <div className="integrate-side-panel">
          <div className="specter" style={{ height: "100%" }}>
            <span className="eyebrow">Who this is for</span>
            <h3 style={{ marginTop: 12, marginBottom: 12 }}>Ecosystem Integrators</h3>
            <p className="app-lede" style={{ fontSize: 14 }}>
              Eclipse provides headless execution primitives. Build customized private order flow into any frontend or bot without fragmented liquidity.
            </p>
            <ul className="dl" style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {INTEGRATORS.map((x) => (
                <li key={x} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--violet)" }} />
                  {x}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: 12, color: "var(--text3)", display: "block" }}>Contract ABI & Interface</span>
              <div className="mono" style={{ fontSize: 12, color: "#fff", marginTop: 4 }}>
                EclipseOrderRegistry: 0xA697...92ad
              </div>
            </div>

            <Link href="/#docs/arch" className="btn btn-ghost btn-sm" style={{ marginTop: 20, alignSelf: "flex-start" }}>
              Read the full architecture docs<IcArrow className="ic" />
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Faucet & Asset Sandbox */}
      <FaucetSandbox />
    </div>
  );
}
