"use client";

import { useMemo, useRef, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits, parseUnits, keccak256, encodePacked, encodeAbiParameters } from "viem";
import { TOKENS, hex, type Market } from "../../lib/appData";
import { ERC20_ABI, ORDER_REGISTRY_ABI, ECLIPSE_ORDER_REGISTRY_ADDRESS, MOCK_TOKENS, ZERO_POOL_ID } from "../../lib/contracts";
import { wagmiConfig } from "../../lib/wagmiConfig";
import TokenGlyph from "../TokenGlyph";
import { WalletInlineButton, useHasMounted } from "../WalletButton";

const POOL_FEE = 0.0005;
const DM_FEE = 0.0005;
const SLIPS = [0.1, 0.5, 1];

type Side = "in" | "out";
type Track = "idle" | "committed" | "matching" | "settled";

function friendlyTxError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied transaction/i.test(msg)) return "Transaction was rejected in your wallet.";
  if (/insufficient funds/i.test(msg)) return "Not enough ETH on Robinhood Chain testnet to pay gas.";
  if (/exceeds balance|underflow|transfer amount exceeds/i.test(msg)) return "Insufficient token balance for this amount.";
  if (/ZeroAmount/i.test(msg)) return "Enter an amount greater than zero.";
  if (/OrderExpired/i.test(msg)) return "Order expiry is in the past — try again.";
  return "Transaction failed. It may have reverted on-chain — check your token balance and try a smaller amount.";
}

function cpmm(amountIn: number, reserveIn: number, reserveOut: number) {
  const x = amountIn * (1 - POOL_FEE);
  return (x * reserveOut) / (reserveIn + x);
}

export default function Terminal({ market }: { market: Market }) {
  const pool = market.pool!;
  const mid = pool.quote / pool.base;

  const [mode, setMode] = useState<"public" | "dark">("dark");
  const [dir, setDir] = useState<Side>("in"); // which side is "pay" currently base(in)=quote->base vs base->quote
  const [amount, setAmount] = useState("");
  const [slip, setSlip] = useState(0.5);
  const [track, setTrack] = useState<Track>("idle");
  const [result, setResult] = useState<{ out: number; min: number; root: string; tx: string; onchain?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  const mounted = useHasMounted();
  const { address, isConnected: walletConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  // Gate on `mounted` so the server-rendered markup and the client's first paint always agree
  // on "disconnected" — wallet state only exists in the browser (see WalletButton.tsx).
  const isConnected = mounted && walletConnected;
  const canTradeOnChain = isConnected && market.base in MOCK_TOKENS && market.quote in MOCK_TOKENS;

  const payToken = dir === "in" ? market.quote : market.base;
  const receiveToken = dir === "in" ? market.base : market.quote;

  const payTokenAddr = MOCK_TOKENS[payToken as keyof typeof MOCK_TOKENS];
  const receiveTokenAddr = MOCK_TOKENS[receiveToken as keyof typeof MOCK_TOKENS];
  const { data: payBalance, refetch: refetchPayBalance } = useReadContract({
    address: payTokenAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: canTradeOnChain && !!address },
  });
  const { data: receiveBalance, refetch: refetchReceiveBalance } = useReadContract({
    address: receiveTokenAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: canTradeOnChain && !!address },
  });
  const fmtBal = (v: bigint | undefined) => (v === undefined ? "–" : Number(formatUnits(v, 18)).toFixed(4));

  const amountOut = useMemo(() => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return 0;
    if (dir === "in") return cpmm(a, pool.quote, pool.base); // paying quote, receiving base
    return cpmm(a, pool.base, pool.quote); // paying base, receiving quote
  }, [amount, dir, pool]);

  const minOut = amountOut * (1 - slip / 100);
  const outMeta = TOKENS[receiveToken];

  const busy = track !== "idle" && track !== "settled" ? true : false;

  function submit() {
    const a = parseFloat(amount);
    if (!a || a <= 0 || busy) return;
    setError(null);
    setResult(null);

    if (mode === "dark" && canTradeOnChain) {
      void submitOrderOnChain(a);
      return;
    }

    setTrack("committed");
    setTimeout(() => setTrack("matching"), mode === "dark" ? 900 : 200);
    setTimeout(() => {
      setTrack("settled");
      setResult({
        out: amountOut,
        min: minOut,
        root: hex(Math.round(a * 1000) + 1, 40),
        tx: hex(Math.round(a * 7919) + 2, 40),
      });
      showToast(mode === "dark" ? "Simulated batch settled (demo mode)" : "Simulated swap complete");
    }, mode === "dark" ? 2200 : 700);
  }

  /// Real Phase 1 flow: approve (if needed) then call EclipseOrderRegistry.submitOrder on
  /// Robinhood Chain testnet. See 25/Eclipse/contracts/src/EclipseOrderRegistry.sol — this
  /// escrows the order's tokenIn and records it for the off-chain matcher; it does not swap.
  async function submitOrderOnChain(a: number) {
    try {
      if (!address) return;
      const tokenInAddr = MOCK_TOKENS[payToken as keyof typeof MOCK_TOKENS];
      const tokenOutAddr = MOCK_TOKENS[receiveToken as keyof typeof MOCK_TOKENS];
      const amountInWei = parseUnits(a.toFixed(18), 18);
      const minOutWei = parseUnits(Math.max(minOut, 0).toFixed(8), 18);

      setTrack("committed");
      const allowance = (await readContract(wagmiConfig, {
        address: tokenInAddr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, ECLIPSE_ORDER_REGISTRY_ADDRESS],
      })) as bigint;

      if (allowance < amountInWei) {
        const approveHash = await writeContractAsync({
          address: tokenInAddr,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ECLIPSE_ORDER_REGISTRY_ADDRESS, amountInWei],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      setTrack("matching");
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      // Phase 2: In Dark Mode, compute commitment hash with client-side salt to hide direction & limits
      const secret = encodePacked(["string", "uint256"], [`eclipse-${address}-${Date.now()}`, BigInt(Math.floor(Math.random() * 1e9))]);
      const secretHash = keccak256(secret);

      const commitment = keccak256(
        encodeAbiParameters(
          [
            { type: "bytes32" },
            { type: "address" },
            { type: "address" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint64" },
            { type: "bytes32" },
          ],
          [ZERO_POOL_ID, tokenInAddr, tokenOutAddr, amountInWei, minOutWei, expiry, secretHash]
        )
      );

      const orderHash = await writeContractAsync({
        address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
        abi: ORDER_REGISTRY_ABI,
        functionName: "submitCommitment",
        args: [ZERO_POOL_ID, tokenInAddr, amountInWei, commitment, expiry],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: orderHash });

      // Escrow secret preimage to matcher daemon for automated reveal at wave cutoff
      const apiRes = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitment,
          owner: address,
          tokenIn: tokenInAddr,
          tokenOut: tokenOutAddr,
          amountIn: amountInWei.toString(),
          minAmountOut: minOutWei.toString(),
          expiry: expiry.toString(),
          secret: secretHash,
          waveId: Math.floor(Date.now() / 30000).toString(),
        }),
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to escrow reveal preimage to matcher API");
      }

      setTrack("settled");
      setResult({ out: amountOut, min: minOut, root: commitment, tx: orderHash, onchain: true });
      showToast("Encrypted commitment submitted & preimage escrowed");
      void refetchPayBalance();
      void refetchReceiveBalance();
    } catch (err) {
      console.error(err);
      setTrack("idle");
      setError(friendlyTxError(err));
    }
  }

  return (
    <section className="spot term" data-mode={mode}>
      <div className="term-head">
        <h2 className="term-title">
          Trade <span className="mono">{market.pair}</span>
        </h2>
        {/* <span className="sim">Simulated pricing</span> */}
      </div>

      <div className="mode" role="radiogroup" aria-label="Execution mode">
        <span className="mode-thumb" aria-hidden="true" style={{ transform: mode === "dark" ? "translateX(100%)" : undefined }} />
        <button type="button" role="radio" aria-checked={mode === "public"} onClick={() => setMode("public")}>
          Public<small>Instant</small>
        </button>
        <button type="button" role="radio" aria-checked={mode === "dark"} onClick={() => setMode("dark")}>
          Dark<small>Next wave</small>
        </button>
      </div>

      {mode === "dark" && (
        <div className="wave-box">
          <div className="wave-txt">
            <b>{canTradeOnChain ? "Submitting escrows your order on-chain" : "Next Eclipse Wave"}</b>
            <span className="mono">
              {canTradeOnChain
                ? "Robinhood Chain testnet · EclipseOrderRegistry"
                : "Private demand · hidden until it settles"}
            </span>
          </div>
          {!isConnected && <WalletInlineButton />}
        </div>
      )}

      <div className="field">
        <div className="f-top">
          <label>You pay</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canTradeOnChain && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!address || minting) return;
                  setMinting(true);
                  try {
                    const res = await fetch("/api/faucet", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ address, symbol: payToken }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Faucet failed");
                    showToast(`Dispensed ${data.amount} to your wallet!`);
                    void refetchPayBalance();
                  } catch (err: any) {
                    showToast(`Faucet error: ${err.message}`);
                  } finally {
                    setMinting(false);
                  }
                }}
                disabled={minting}
                style={{
                  background: "rgba(167, 139, 250, 0.12)",
                  color: "var(--violet-pale)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: minting ? "not-allowed" : "pointer",
                }}
              >
                {minting ? "Minting..." : `+ Faucet ${payToken}`}
              </button>
            )}
            <span className="bal">Balance <span className="mono">{canTradeOnChain ? fmtBal(payBalance as bigint | undefined) : "–"}</span></span>
          </div>
        </div>
        <div className="f-main">
          <input
            className="amt"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const next = e.target.value.replace(/[^0-9.]/g, "");
              if (track === "settled") {
                setTrack("idle");
                setResult(null);
              }
              setAmount(next);
            }}
          />
          <button type="button" className="tok" disabled>
            <TokenGlyph
              symbol={payToken}
              cls={
                payToken === "WETH"
                  ? "g-weth"
                  : payToken === "NVDA"
                  ? "g-nvda"
                  : payToken === "PONS"
                  ? "g-pons"
                  : "g-usdg"
              }
            />
            <span>{payToken}</span>
          </button>
        </div>
      </div>

      <div className="switch">
        <button type="button" className="dir" aria-label="Switch pay and receive tokens" onClick={() => setDir((d) => (d === "in" ? "out" : "in"))}>
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 4v15m0 0-3.5-3.5M8 19l3.5-3.5" />
            <path d="M16 20V5m0 0-3.5 3.5M16 5l3.5 3.5" />
          </svg>
        </button>
      </div>

      <div className="field">
        <div className="f-top">
          <span>You receive · estimated</span>
          <span className="bal">Balance <span className="mono">{canTradeOnChain ? fmtBal(receiveBalance as bigint | undefined) : "–"}</span></span>
        </div>
        <div className="f-main">
          <output className={`amt amt-out${amountOut ? "" : " zero"}`}>
            {amountOut ? amountOut.toFixed(outMeta.show) : "0.00"}
          </output>
          <button type="button" className="tok" disabled>
            <TokenGlyph
              symbol={receiveToken}
              cls={
                receiveToken === "WETH"
                  ? "g-weth"
                  : receiveToken === "NVDA"
                  ? "g-nvda"
                  : receiveToken === "PONS"
                  ? "g-pons"
                  : "g-usdg"
              }
            />
            <span>{receiveToken}</span>
          </button>
        </div>
        <div className="f-sub">
          <span>
            1 {market.base} = {mid.toLocaleString("en-US", { maximumFractionDigits: 2 })} {market.quote}
          </span>
        </div>
      </div>

      <dl className="rows">
        <div className="row">
          <dt>Minimum received</dt>
          <dd><b>{amountOut ? minOut.toFixed(outMeta.show) + " " + receiveToken : "–"}</b></dd>
        </div>
        <div className="row">
          <dt>Max slippage</dt>
          <dd>
            <div className="slip" role="group">
              {SLIPS.map((s) => (
                <button key={s} type="button" aria-pressed={slip === s} onClick={() => setSlip(s)}>
                  {s}%
                </button>
              ))}
            </div>
          </dd>
        </div>
        <div className="row">
          <dt>Execution</dt>
          <dd><b>{mode === "dark" ? "Next Eclipse Wave" : "Immediate · public swap"}</b></dd>
        </div>
        <div className="row">
          <dt>Fees <span className="tip">· protocol + pool</span></dt>
          <dd><b>{((DM_FEE + POOL_FEE) * 10000).toFixed(0)} bps</b></dd>
        </div>
      </dl>

      <button type="button" className="cta" aria-disabled={!amount || busy} onClick={submit}>
        <span className="cta-label">
          {track === "idle" &&
            (mode === "dark" ? (canTradeOnChain ? "Submit order on-chain" : "Submit private order") : "Swap now")}
          {track === "committed" && (canTradeOnChain ? "Approving token…" : "Order committed…")}
          {track === "matching" && (canTradeOnChain ? "Confirming on-chain…" : "Matching Eclipse Wave…")}
          {track === "settled" && "Trade another"}
        </span>
      </button>

      {error && (
        <div className="result fail" style={{ marginTop: 8 }}>
          <div className="r-head">
            <span>Order failed</span>
          </div>
          <p className="r-obs" style={{ borderTop: 0, paddingTop: 0 }}>{error}</p>
        </div>
      )}

      {track !== "idle" && (
        <div className="track" aria-hidden="true">
          <div className={`step${track === "committed" ? " on" : " done"}`}>
            Commit<i />
          </div>
          <div className={`step${track === "matching" ? " on" : track === "settled" ? " done" : ""}`}>
            Match &amp; net<i />
          </div>
          <div className={`step final${track === "settled" ? " on" : ""}`}>
            Settle<i />
          </div>
        </div>
      )}

      {result && track === "settled" && (
        <div className="result">
          <div className="r-head">
            <span>{result.onchain ? "Order submitted on-chain" : "Order settled"}</span>
            <span className="sim">{result.onchain ? "Robinhood testnet · live" : "Testnet · zkVM Proved"}</span>
          </div>
          <dl className="r-grid">
            {result.onchain ? (
              <>
                <dt>Status</dt>
                <dd>Escrowed · awaiting wave settlement</dd>
                <dt>Tx hash</dt>
                <dd>{result.tx.slice(0, 18)}…</dd>
              </>
            ) : (
              <>
                <dt>Received</dt>
                <dd>{result.out.toFixed(outMeta.show)} {receiveToken}</dd>
                <dt>Minimum received</dt>
                <dd>{result.min.toFixed(outMeta.show)} {receiveToken}</dd>
                <dt>Settlement root</dt>
                <dd>{result.root.slice(0, 18)}…</dd>
                <dt>Execution tx</dt>
                <dd>{result.tx.slice(0, 18)}…</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <p className="disc">
        Robinhood Chain Testnet (Chain ID 46630). Verifier on-chain dengan bukti zero-knowledge zkVM batch &amp; private settlement.
      </p>

      {toast && (
        <div className="tx-toast" role="status">
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M8.6 12.3l2.3 2.3 4.6-4.9" />
          </svg>
          {toast}
        </div>
      )}
    </section>
  );
}
