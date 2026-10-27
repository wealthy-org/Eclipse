"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getPublicClient, readContract } from "wagmi/actions";
import { formatUnits } from "viem";
import { wagmiConfig } from "../../lib/wagmiConfig";
import {
  ECLIPSE_ORDER_REGISTRY_ADDRESS,
  ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK,
  ORDER_REGISTRY_ABI,
  MOCK_TOKENS,
} from "../../lib/contracts";

const STATUS_LABEL = ["Open", "Cancelled", "Locked", "Settled"];

function symbolFor(addr: string) {
  const entry = Object.entries(MOCK_TOKENS).find(([, a]) => a.toLowerCase() === addr.toLowerCase());
  return entry ? entry[0] : addr.slice(0, 8) + "…";
}

interface OrderRow {
  orderId: bigint;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  waveId: bigint;
  status: number;
  txHash: string;
}

export default function MyOrders() {
  const { address, isConnected } = useAccount();
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setRows(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const client = getPublicClient(wagmiConfig);
      if (!client) {
        if (!cancelled) setLoading(false);
        return;
      }

      // 1. Fetch Phase 1 Plaintext Orders
      const orderLogs = await client.getLogs({
        address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
        event: ORDER_REGISTRY_ABI.find((x) => x.type === "event" && x.name === "OrderSubmitted")!,
        args: { owner: address },
        fromBlock: ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK,
        toBlock: "latest",
      });

      // 2. Fetch Phase 2 Encrypted Commitment Orders
      const commitmentLogs = await client.getLogs({
        address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
        event: ORDER_REGISTRY_ABI.find((x) => x.type === "event" && x.name === "CommitmentSubmitted")!,
        args: { owner: address },
        fromBlock: ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK,
        toBlock: "latest",
      });

      const orderRows = await Promise.all(
        orderLogs.map(async (log) => {
          const a = log.args as {
            orderId: bigint;
            tokenIn: string;
            tokenOut: string;
            amountIn: bigint;
            minAmountOut: bigint;
            waveId: bigint;
          };
          const order = (await readContract(wagmiConfig, {
            address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
            abi: ORDER_REGISTRY_ABI,
            functionName: "orders",
            args: [a.orderId],
          })) as readonly [string, string, string, string, bigint, bigint, bigint, bigint, bigint, number];

          return {
            orderId: a.orderId,
            tokenIn: a.tokenIn,
            tokenOut: a.tokenOut,
            amountIn: a.amountIn,
            minAmountOut: a.minAmountOut,
            waveId: a.waveId,
            status: order[9],
            txHash: log.transactionHash,
          } satisfies OrderRow;
        })
      );

      const commitmentRows = await Promise.all(
        commitmentLogs.map(async (log) => {
          const ca = log.args as {
            orderId: bigint;
            owner: string;
            commitment: string;
            tokenIn: string;
            amountIn: bigint;
            waveId: bigint;
          };
          const order = (await readContract(wagmiConfig, {
            address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
            abi: ORDER_REGISTRY_ABI,
            functionName: "orders",
            args: [ca.orderId],
          })) as readonly [string, string, string, string, bigint, bigint, bigint, bigint, bigint, number];

          return {
            orderId: ca.orderId,
            tokenIn: ca.tokenIn,
            tokenOut: order[3], // address(0) if still locked in commitment, or revealed tokenOut
            amountIn: ca.amountIn,
            minAmountOut: order[5], // 0 if locked, or revealed minAmountOut
            waveId: ca.waveId,
            status: order[9], // 2 = Locked (Commitment), 0 = Open, 3 = Settled
            txHash: log.transactionHash,
          } satisfies OrderRow;
        })
      );

      // Merge and deduplicate by orderId
      const map = new Map<string, OrderRow>();
      for (const row of [...orderRows, ...commitmentRows]) {
        map.set(row.orderId.toString(), row);
      }
      const combined = Array.from(map.values());

      if (!cancelled) {
        setRows(combined.sort((x, y) => Number(y.orderId - x.orderId)));
        setLoading(false);
      }
    })().catch((err) => {
      console.error("Error fetching orders:", err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  if (!isConnected) return null;

  return (
    <div className="my-orders">
      <div className="my-orders-head">
        <h3>My orders</h3>
        <span className="sim">Robinhood Chain · live</span>
      </div>
      {loading && (
        <div className="hidden-box">
          <div className="mask" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          Reading your orders from chain…
        </div>
      )}
      {!loading && rows && rows.length === 0 && (
        <div className="hidden-box">
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, margin: "0 auto 12px", color: "var(--text3)" }}>
            <path d="M6.5 3.5h7l4.5 4.5v12.5h-11.5z" />
            <path d="M13.5 3.5V8H18" />
            <path d="M9.5 12.5h5M9.5 16h3" />
          </svg>
          <p style={{ margin: 0 }}>No orders submitted from this wallet yet.</p>
          <p style={{ margin: "4px 0 0", color: "var(--text3)", fontSize: 13 }}>
            Submit a private order above — it&apos;ll show up here as soon as it&apos;s on-chain.
          </p>
        </div>
      )}
      {!loading && rows && rows.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Pay</th>
                <th>Min receive</th>
                <th>Wave</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId.toString()}>
                  <td className="w">
                    {r.txHash ? (
                      <a
                        href={`https://robinhoodchain.blockscout.com/tx/${r.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--text)",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="View order transaction on Robinhood Chain Explorer"
                      >
                        #{r.orderId.toString()}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: "var(--mint)" }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      `#${r.orderId.toString()}`
                    )}
                  </td>
                  <td>
                    {formatUnits(r.amountIn, 18)} {symbolFor(r.tokenIn)}
                  </td>
                  <td>
                    {r.status === 2 && r.tokenOut === "0x0000000000000000000000000000000000000000" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text3)" }}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 14, height: 14 }}
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Hidden (Private)</span>
                      </span>
                    ) : (
                      `${formatUnits(r.minAmountOut, 18)} ${symbolFor(r.tokenOut)}`
                    )}
                  </td>
                  <td>#{r.waveId.toString()}</td>
                  <td>
                    <span className={`pill${r.status === 3 ? " s-settled" : r.status === 0 ? " s-open" : r.status === 2 ? " s-locked" : ""}`}>
                      <i />
                      {r.status === 2 ? "Committed" : STATUS_LABEL[r.status] ?? "Unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
