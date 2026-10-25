import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS } from "../../../lib/appData";
import Terminal from "../Terminal";
import MyOrders from "../MyOrders";
import { IcArrow } from "../../icons";

export function generateStaticParams() {
  return MARKETS.map((m) => ({ id: m.id }));
}

async function MarketDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = MARKETS.find((m) => m.id === id);
  if (!market) notFound();

  return (
    <>
      <div className="market-detail-grid">
        <div className="market-info-panel">
          <div>
            <p className="eyebrow">{market.venue}</p>
            <h1 className="app-h1">{market.pair}</h1>
            <p className="app-lede">
              {market.note}. Dark orders in this pair batch into the continuous 30–60 second Eclipse Wave with zero-knowledge batch validation on zkVM. Public
              swaps execute against the underlying Uniswap v4 liquidity pool.
            </p>
          </div>

          <div className="mx-grid" style={{ marginTop: 8 }}>
            <div className="mx">
              <dt>Reference price</dt>
              <dd>{market.price !== "—" ? `${market.price} USDG` : "—"}</dd>
            </div>
            <div className="mx">
              <dt>Execution path</dt>
              <dd style={{ fontSize: 18 }}>Eclipse Wave</dd>
            </div>
            <div className="mx">
              <dt>Liquidity venue</dt>
              <dd style={{ fontSize: 16 }}>Uniswap v4</dd>
            </div>
            {market.pool ? (
              <>
                <div className="mx">
                  <dt>Base reserve</dt>
                  <dd style={{ fontSize: 16 }}>{market.pool.base.toLocaleString()} {market.base}</dd>
                </div>
                <div className="mx">
                  <dt>Quote reserve</dt>
                  <dd style={{ fontSize: 16 }}>${market.pool.quote.toLocaleString()}</dd>
                </div>
                <div className="mx">
                  <dt>Dark Protocol Fee</dt>
                  <dd style={{ fontSize: 16 }}>5 bps (0.05%)</dd>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="market-terminal-wrap">
          {market.status === "live" && market.pool ? (
            <Terminal market={market} />
          ) : (
            <div className="hidden-box" style={{ padding: "48px 24px" }}>
              <p className="app-lede" style={{ margin: 0 }}>
                {market.note} — not open for trading yet. Trading here is gated on legal and technical review per the
                developer brief.
              </p>
            </div>
          )}
        </div>
      </div>

      {market.status === "live" && market.pool ? <MyOrders /> : null}
    </>
  );
}

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="app-page">
      <Link href="/markets" className="btn-link" style={{ marginBottom: 8 }}>
        <IcArrow className="ic ic-back" />
        Markets
      </Link>
      <Suspense fallback={<p className="app-lede">Loading market…</p>}>
        <MarketDetailContent params={params} />
      </Suspense>
    </div>
  );
}
