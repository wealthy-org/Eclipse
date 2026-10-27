import { PRIVACY_PHASES, PRIVACY_ROWS } from "../../lib/appData";

export default function PrivacyPage() {
  return (
    <div className="app-page">
      <p className="eyebrow">Visibility</p>
      <h1 className="app-h1">Privacy, stated plainly.</h1>
      <p className="app-lede">
        Privacy arrives in phases. Here is exactly what stays hidden at each one — nothing here is live yet.
      </p>

      <div className="ph">
        <table>
          <thead>
            <tr>
              <th scope="col">Observable</th>
              {PRIVACY_PHASES.map((p) => (
                <th key={p.id} scope="col">
                  {p.label}
                  <b>{p.title}</b>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIVACY_ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {(["a", "b", "c", "d"] as const).map((k) => {
                  const cell = row[k];
                  return (
                    <td key={k} className={cell.cls}>
                      {cell.v}
                      {cell.sub ? <small>{cell.sub}</small> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Interactive MEV Attack Vector Simulation */}
      <div style={{
        marginTop: 32,
        padding: "24px 28px",
        borderRadius: "16px",
        background: "var(--panel)",
        border: "1px solid var(--line2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <b style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 10, color: "var(--text)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, color: "var(--violet)" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              MEV & Information Leakage Simulator
            </b>
            <span style={{ fontSize: 13, color: "var(--text3)", display: "block", marginTop: 4 }}>
              Compare what public mempool searchers see versus what Eclipse reveals on Robinhood Chain Mainnet.
            </span>
          </div>
          <span className="badge live" style={{ fontSize: 11, padding: "2px 8px" }}>Active Shielded Protection</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Public Mempool */}
          <div style={{
            padding: "20px",
            borderRadius: "12px",
            background: "rgba(255, 156, 156, 0.03)",
            border: "1px solid rgba(255, 156, 156, 0.15)",
          }}>
            <b style={{ color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Standard Public DEX Swap
            </b>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "8px 0 12px" }}>
              Every parameter is unmasked in the public mempool before mining:
            </p>
            <div className="mono" style={{ fontSize: 12, background: "rgba(0,0,0,0.35)", padding: "12px", borderRadius: "8px", lineHeight: 1.7, border: "1px solid var(--line)" }}>
              <div>Trader: 0xb91E...B5AE <span style={{ color: "var(--danger)" }}>(Exposed)</span></div>
              <div>Token In: 12,000 USDG</div>
              <div>Token Out: WETH <span style={{ color: "var(--danger)" }}>(Direction Exposed)</span></div>
              <div>Min Out: 3.81 WETH <span style={{ color: "var(--danger)" }}>(Sandwichable limit)</span></div>
              <div style={{ color: "var(--danger)", marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                Result: MEV bot sandwiches tx for ~15 bps loss
              </div>
            </div>
          </div>

          {/* Eclipse Dark Mode */}
          <div style={{
            padding: "20px",
            borderRadius: "12px",
            background: "rgba(131, 232, 192, 0.03)",
            border: "1px solid rgba(131, 232, 192, 0.18)",
          }}>
            <b style={{ color: "var(--mint)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Eclipse Dark Mode (On-Chain Commitment)
            </b>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "8px 0 12px" }}>
              Limits & direction remain zeroed on-chain until wave batch lock:
            </p>
            <div className="mono" style={{ fontSize: 12, background: "rgba(0,0,0,0.35)", padding: "12px", borderRadius: "8px", lineHeight: 1.7, border: "1px solid var(--line)" }}>
              <div>Trader: 0xb91E...B5AE</div>
              <div>Token In: 12,000 USDG (Escrowed)</div>
              <div>Token Out: <span style={{ color: "var(--mint)" }}>0x0000...0000 (Hidden)</span></div>
              <div>Commitment: <span style={{ color: "var(--violet-pale)" }}>0x999e52c2...9743 (Salted)</span></div>
              <div style={{ color: "var(--mint)", marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                Result: Zero sandwiching · Settles at uniform clearing price
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="ph-note">
        Viewing keys are being researched, and an access and screening policy comes before any launch. See the
        protocol architecture specifications for the privacy questions this still needs to answer.
      </p>
    </div>
  );
}
