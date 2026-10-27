"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { MOCK_TOKENS, ERC20_ABI } from "../../lib/contracts";
import TokenGlyph from "../TokenGlyph";

export default function FaucetSandbox() {
  const { address, isConnected } = useAccount();
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const tokens = [
    { symbol: "WETH", name: "Wrapped Ether", address: MOCK_TOKENS.WETH, amount: "0.1", label: "0.1 WETH" },
    { symbol: "USDG", name: "USD Global", address: MOCK_TOKENS.USDG, amount: "500", label: "500 USDG" },
    { symbol: "NVDA", name: "NVIDIA Tokenized Stock", address: MOCK_TOKENS.NVDA, amount: "5", label: "5 NVDA" },
    { symbol: "PONS", name: "Pons Protocol", address: MOCK_TOKENS.PONS, amount: "100", label: "100 PONS" },
  ];

  const contractsConfig = tokens.map((t) => ({
    address: t.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  }));

  const { data: balances, refetch } = useReadContracts({
    contracts: contractsConfig,
    query: { enabled: !!address },
  });

  async function dispense(symbol: string) {
    if (!address || loadingToken || loadingAll) return;
    setLoadingToken(symbol);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, symbol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Faucet transfer failed");

      setStatusMsg(`Dispensed ${data.amount} to ${address.slice(0, 6)}...${address.slice(-4)}`);
      void refetch();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoadingToken(null);
    }
  }

  async function dispenseAll() {
    if (!address || loadingAll || loadingToken) return;
    setLoadingAll(true);
    setStatusMsg("Dispensing multi-asset package to your wallet on Robinhood Chain...");

    try {
      for (const t of tokens) {
        await fetch("/api/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, symbol: t.symbol }),
        });
      }
      setStatusMsg("Successfully minted all test tokens (WETH, USDG, NVDA, PONS)!");
      void refetch();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoadingAll(false);
    }
  }

  return (
    <div style={{
      marginTop: 28,
      padding: "26px",
      borderRadius: "16px",
      background: "rgba(18, 19, 26, 0.6)",
      border: "1px solid var(--line)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Asset Sandbox &amp; Mint Tool</h3>
            <span className="badge live" style={{ fontSize: 11, padding: "2px 8px" }}>Robinhood Chain (ID 4663)</span>
          </div>
          <p style={{ margin: "6px 0 0", color: "var(--text3)", fontSize: 13 }}>
            Token liquidity sandbox for developers, integrators, and auditors testing dark batch netting on Robinhood Chain (ID 4663).
          </p>
        </div>

        {isConnected && (
          <button
            type="button"
            onClick={dispenseAll}
            disabled={loadingAll || !!loadingToken}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 600, padding: "8px 16px" }}
          >
            {loadingAll ? "Dispensing Bundle..." : "Mint All Test Tokens (1-Click)"}
          </button>
        )}
      </div>

      {statusMsg && (
        <div style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: 12,
          background: statusMsg.startsWith("Error") ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
          border: `1px solid ${statusMsg.startsWith("Error") ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
          color: statusMsg.startsWith("Error") ? "var(--warn)" : "var(--mint)",
        }}>
          {statusMsg}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginTop: 20,
      }}>
        {tokens.map((t, idx) => {
          const bal = balances?.[idx]?.result;
          const fmt = bal !== undefined ? Number(formatUnits(bal as bigint, 18)).toFixed(2) : "–";
          const isPending = loadingToken === t.symbol;

          return (
            <div
              key={t.symbol}
              style={{
                padding: "18px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <TokenGlyph symbol={t.symbol} cls={`g-${t.symbol.toLowerCase()}`} />
                <div>
                  <b style={{ color: "#fff", fontSize: 15 }}>{t.symbol}</b>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text3)" }}>{t.name}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "var(--text3)", display: "block" }}>Your Wallet Balance</span>
                <b className="mono" style={{ fontSize: 16, color: "#fff" }}>
                  {isConnected ? fmt : "Disconnected"}
                </b>
              </div>

              <button
                type="button"
                onClick={() => dispense(t.symbol)}
                disabled={!isConnected || isPending || loadingAll}
                className="btn btn-ghost btn-sm"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: isConnected ? 1 : 0.5,
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                {isPending ? "Minting..." : `Mint ${t.label}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
