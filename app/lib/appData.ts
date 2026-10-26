// Simulated data for the Eclipse app shell. No backend/contract yet (Phase 1).

export function hex(seed: number, len = 48) {
  let h = (2166136261 ^ (seed * 2654435761)) >>> 0;
  let s = "";
  while (s.length < len) {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    s += h.toString(16).padStart(8, "0");
  }
  return "0x" + s.slice(0, len);
}

export interface TokenMeta {
  symbol: string;
  show: number; // decimal places to display
  inDec: number; // decimal places accepted on input
  name: string;
  sub: string;
}

export const TOKENS: Record<string, TokenMeta> = {
  USDG: { symbol: "USDG", show: 2, inDec: 2, name: "USDG", sub: "Dollar stable · Testnet live" },
  WETH: { symbol: "WETH", show: 4, inDec: 6, name: "WETH", sub: "Wrapped Ether · Testnet live" },
  NVDA: { symbol: "NVDA", show: 2, inDec: 4, name: "NVDA", sub: "NVIDIA Stock Token · Testnet live" },
  PONS: { symbol: "PONS", show: 2, inDec: 4, name: "PONS", sub: "Pons Graduated Token · Testnet live" },
};

export type MarketStatus = "live" | "research" | "planned";

export interface Market {
  id: string;
  pair: string;
  base: string;
  quote: string;
  venue: string;
  status: MarketStatus;
  note: string;
  price: string;
  /** constant-product reserves, only set for tradable (live) markets */
  pool?: { base: number; quote: number };
}

export const MARKETS: Market[] = [
  {
    id: "weth-usdg",
    pair: "WETH / USDG",
    base: "WETH",
    quote: "USDG",
    venue: "Uniswap v4 · EclipseHook",
    status: "live",
    note: "Robinhood Chain Testnet · zkVM Proved",
    price: "3,142.50",
    pool: { base: 4200, quote: 13198500 },
  },
  {
    id: "nvda-usdg",
    pair: "NVDA / USDG",
    base: "NVDA",
    quote: "USDG",
    venue: "Tokenized Equity · 24/7 Dark Pool",
    status: "live",
    note: "Robinhood Chain Testnet · zkVM Proved",
    price: "138.25",
    pool: { base: 45000, quote: 6221250 },
  },
  {
    id: "pons-usdg",
    pair: "PONS / USDG",
    base: "PONS",
    quote: "USDG",
    venue: "Graduated Pons · Executor Route",
    status: "live",
    note: "Robinhood Chain Testnet · zkVM Proved",
    price: "0.485",
    pool: { base: 2500000, quote: 1212500 },
  },
];

export type WaveState = "open" | "locked" | "matching" | "executing" | "settling" | "settled";

export interface WaveRecord {
  id: number;
  market: string;
  orders: number;
  state: WaveState;
  grossVolume: number;
  internalMatched: number;
  netPublic: number;
  nettingEfficiency: number;
  settlementRoot: string;
  executionTx: string;
}

export const WAVES: WaveRecord[] = Array.from({ length: 12 }).map((_, i) => {
  const id = 196 - i;
  const gross = 60000 + ((id * 9973) % 160000);
  const matched = Math.round(gross * (0.55 + ((id * 37) % 30) / 100));
  const net = gross - matched;
  return {
    id,
    market: "WETH / USDG",
    orders: 7 + (id % 9),
    state: i === 0 ? "settling" : "settled",
    grossVolume: gross,
    internalMatched: matched,
    netPublic: net,
    nettingEfficiency: matched / gross,
    settlementRoot: hex(id, 40),
    executionTx: hex(id * 7, 40),
  };
});

export const PROTOCOL_STATS = {
  darkVolume: 2_140_000,
  netPublicVolume: 412_000,
  nettingEfficiency: 0.81,
  waves: WAVES.length + 184,
  participants: 612,
  integratedMarkets: 1,
  integrators: 0,
  avgFill: 0.986,
  avgSlippageBps: 4.2,
};

export const PRIVACY_PHASES = [
  { id: "a", label: "Layer 1", title: "Batch Auctions" },
  { id: "b", label: "Layer 2", title: "Encrypted Orders" },
  { id: "c", label: "Layer 3", title: "ZK Validity Proofs" },
  { id: "d", label: "Layer 4", title: "Shielded Settlements" },
] as const;

export const PRIVACY_ROWS: {
  label: string;
  a: { v: string; sub?: string; cls: "v" | "h" | "p" };
  b: { v: string; sub?: string; cls: "v" | "h" | "p" };
  c: { v: string; sub?: string; cls: "v" | "h" | "p" };
  d: { v: string; sub?: string; cls: "v" | "h" | "p" };
}[] = [
  {
    label: "Your order before the wave trades",
    a: { v: "Visible", cls: "v" },
    b: { v: "Hidden", sub: "from the public", cls: "h" },
    c: { v: "Hidden", cls: "h" },
    d: { v: "Hidden", cls: "h" },
  },
  {
    label: "Your swap on the pool",
    a: { v: "Combined", cls: "h" },
    b: { v: "Combined", cls: "h" },
    c: { v: "Combined", cls: "h" },
    d: { v: "Combined", cls: "h" },
  },
  {
    label: "Your wallet linked to deposit and payout",
    a: { v: "Visible", cls: "v" },
    b: { v: "Visible", cls: "v" },
    c: { v: "Visible", cls: "v" },
    d: { v: "Hidden", sub: "design TBD", cls: "h" },
  },
  {
    label: "Operator can see your order",
    a: { v: "Yes", cls: "v" },
    b: { v: "Yes", cls: "v" },
    c: { v: "Yes", sub: "but cannot misreport", cls: "v" },
    d: { v: "TBD", cls: "v" },
  },
  {
    label: "Proof the batch was matched correctly",
    a: { v: "Trust the operator", cls: "v" },
    b: { v: "Trust the operator", cls: "v" },
    c: { v: "Proven", sub: "planned", cls: "p" },
    d: { v: "Proven", sub: "planned", cls: "p" },
  },
];
