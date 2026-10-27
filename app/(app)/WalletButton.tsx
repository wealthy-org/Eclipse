"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { robinhoodTestnet } from "../lib/chains";

/// Wallet connection state is only known in the browser (wagmi restores it from localStorage
/// after mount). Rendering it during SSR/first paint causes a hydration mismatch — gate on this
/// so both server and the first client render agree on "disconnected", then swap in afterward.
export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function short(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function fmtEth(wei: bigint) {
  const n = Number(wei) / 1e18;
  return n < 0.0001 && n > 0 ? "<0.0001" : n.toFixed(4);
}

/// Adds/switches to Robinhood Chain Mainnet in the connected wallet. `switchChain` fails with a
/// "chain not added" error (EIP-3085 code 4902) in wallets that don't already know this chain —
/// fall back to asking the wallet to add it directly.
async function switchOrAddChain() {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1237" }] });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x1237",
          chainName: robinhoodTestnet.name,
          nativeCurrency: robinhoodTestnet.nativeCurrency,
          rpcUrls: robinhoodTestnet.rpcUrls.default.http,
          blockExplorerUrls: [robinhoodTestnet.blockExplorers.default.url],
        },
      ],
    });
  }
}

function useWalletInfo() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address, chainId: robinhoodTestnet.id, query: { enabled: isConnected } });
  const wrongNetwork = isConnected && chainId !== robinhoodTestnet.id;
  return { address, isConnected, wrongNetwork, balance };
}

export function WalletRailButton() {
  const mounted = useHasMounted();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { wrongNetwork, balance } = useWalletInfo();
  const [open, setOpen] = useState(false);

  if (mounted && isConnected && address) {
    return (
      <div className="rail-wallet-wrap">
        {open && (
          <div className="rail-wallet-pop">
            <div className="rail-wallet-pop-row">
              <span>Address</span>
              <b className="mono">{short(address)}</b>
            </div>
            <div className="rail-wallet-pop-row">
              <span>Network</span>
              {wrongNetwork ? (
                <button type="button" className="max" onClick={switchOrAddChain}>
                  Switch network
                </button>
              ) : (
                <b className="mono" style={{ color: "var(--mint)" }}>
                  Robinhood Chain
                </b>
              )}
            </div>
            <div className="rail-wallet-pop-row">
              <span>Balance</span>
              <b className="mono">{balance ? `${fmtEth(balance.value)} ETH` : "–"}</b>
            </div>
            <button type="button" className="btn-link" style={{ marginTop: 4 }} onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
        <button
          type="button"
          className={`rail-item rail-wallet on${wrongNetwork ? " warn" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={`Connected ${address}`}
        >
          <span className="rail-wallet-dot" />
          <span className="rail-tip">{short(address)} · {wrongNetwork ? "Wrong network" : "Connected"}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="rail-item rail-wallet"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      aria-label="Connect wallet"
    >
      <svg viewBox="0 0 24 24" className="rail-ic" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      <span className="rail-tip">{isPending ? "Connecting…" : "Connect wallet"}</span>
    </button>
  );
}

/// Inline variant used inside the terminal, where the icon-only rail button doesn't apply.
export function WalletInlineButton() {
  const mounted = useHasMounted();
  const { connect, connectors, isPending } = useConnect();
  const { address, isConnected, wrongNetwork, balance } = useWalletInfo();
  const { disconnect } = useDisconnect();

  if (mounted && isConnected && address) {
    return (
      <div className="wallet-inline">
        <div className="wallet-inline-info">
          <b className="mono">{short(address)}</b>
          <span className="mono">{balance ? `${fmtEth(balance.value)} ETH` : "–"}</span>
        </div>
        {wrongNetwork ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={switchOrAddChain}>
            Switch to Robinhood Chain
          </button>
        ) : (
          <button type="button" className="btn-link" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
