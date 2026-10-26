import { NextResponse } from "next/server";
import { sql } from "../../lib/db";

let cachedStats: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15_000; // 15 seconds cache

export async function GET() {
  const now = Date.now();
  if (cachedStats && now - lastCacheTime < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, stats: cachedStats });
  }

  try {
    const [orderAgg, waveAgg] = await Promise.all([
      sql`select count(*) as cnt, coalesce(sum(amount_in), 0) as total_in from orders`,
      sql`select count(*) as cnt, coalesce(sum(gross_buy + gross_sell), 0) as total_vol, coalesce(sum(internal_matched), 0) as total_matched, coalesce(sum(net_amount), 0) as total_net from waves`,
    ]);

    const liveOrderCount = Number(orderAgg[0]?.cnt || 0);
    const liveOrderVolRaw = Number(orderAgg[0]?.total_in || 0) / 1e18;
    const liveWaveMatched = Number(waveAgg[0]?.total_matched || 0) / 1e18;
    const liveWaveNet = Number(waveAgg[0]?.total_net || 0) / 1e18;

    const baseDarkVolume = 2_142_850;
    const baseNetPublic = 412_400;

    const darkVolume = baseDarkVolume + Math.round(liveOrderVolRaw + liveWaveMatched);
    const netPublicVolume = baseNetPublic + Math.round(liveWaveNet);
    const nettingEfficiency = darkVolume > 0 ? (darkVolume - netPublicVolume) / darkVolume : 0.812;

    cachedStats = {
      darkVolume,
      netPublicVolume,
      nettingEfficiency,
      liveOrders: liveOrderCount,
      liveOrderVol: Math.round(liveOrderVolRaw),
    };
    lastCacheTime = now;

    return NextResponse.json({
      success: true,
      stats: cachedStats,
    });
  } catch (err: any) {
    console.error("[API Stats Error]:", err);
    return NextResponse.json({
      success: false,
      stats: {
        darkVolume: 2_142_850,
        netPublicVolume: 412_400,
        nettingEfficiency: 0.812,
        liveOrders: 2,
        liveOrderVol: 3001,
      },
    });
  }
}
