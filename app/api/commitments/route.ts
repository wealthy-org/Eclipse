import { sql } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      commitment,
      orderId,
      owner,
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      expiry,
      secret,
      waveId,
    } = body;

    if (!commitment || !owner || !secret || !tokenIn || !tokenOut) {
      return NextResponse.json({ error: "Missing required commitment parameters" }, { status: 400 });
    }

    await sql`
      insert into commitments (
        commitment, order_id, owner, token_in, token_out, amount_in, min_amount_out, expiry, secret, wave_id, revealed
      ) values (
        ${commitment},
        ${orderId ? String(orderId) : null},
        ${owner.toLowerCase()},
        ${tokenIn.toLowerCase()},
        ${tokenOut.toLowerCase()},
        ${String(amountIn)},
        ${String(minAmountOut)},
        ${String(expiry)},
        ${secret},
        ${String(waveId)},
        false
      )
      on conflict (commitment) do update set
        order_id = coalesce(excluded.order_id, commitments.order_id),
        secret = excluded.secret,
        token_out = excluded.token_out,
        min_amount_out = excluded.min_amount_out
    `;

    return NextResponse.json({ success: true, commitment });
  } catch (err: any) {
    console.error("[Commitments API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to store commitment" }, { status: 500 });
  }
}
