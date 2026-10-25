// Core matching logic extracted for reuse in CLI and daemon
import { sql } from "./db.js";
import { walletClient, publicClient, ECLIPSE_ORDER_REGISTRY_ADDRESS, MOCK_WETH_ADDRESS, MOCK_USDG_ADDRESS } from "./chain.js";
import { ORDER_REGISTRY_ABI } from "./abi.js";

const PRICE_WETH_PER_USDG = 1n; // Phase 1 simplification (1:1 pool at current testnet setup)

export interface DbOrder {
  order_id: string;
  owner: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  min_amount_out: string;
  status: number;
}

export async function runMatching(): Promise<number> {
  if (!walletClient) {
    throw new Error("PRIVATE_KEY is not set — the matcher needs it to sign settleMatchedPair.");
  }

  const open = await sql<DbOrder[]>`
    select order_id, owner, token_in, token_out, amount_in, min_amount_out, status 
    from orders 
    where status = 0 
    order by order_id asc
  `;

  if (open.length === 0) {
    return 0;
  }

  const sells = open.filter((o) => o.token_in.toLowerCase() === MOCK_WETH_ADDRESS);
  const buys = open.filter((o) => o.token_in.toLowerCase() === MOCK_USDG_ADDRESS);

  const sellRemaining = new Map(sells.map((o) => [o.order_id, BigInt(o.amount_in)]));
  const buyRemaining = new Map(buys.map((o) => [o.order_id, BigInt(o.amount_in)]));

  let si = 0;
  let bi = 0;
  let matchedCount = 0;

  while (si < sells.length && bi < buys.length) {
    const sell = sells[si];
    const buy = buys[bi];
    const sellLeft = sellRemaining.get(sell.order_id)!;
    const buyLeftUsdg = buyRemaining.get(buy.order_id)!;
    const buyLeftInWeth = buyLeftUsdg / PRICE_WETH_PER_USDG;

    const matchedWeth = sellLeft < buyLeftInWeth ? sellLeft : buyLeftInWeth;
    if (matchedWeth === 0n) {
      if (sellLeft === 0n) si++;
      else bi++;
      continue;
    }
    const matchedUsdg = matchedWeth * PRICE_WETH_PER_USDG;

    const sellMinForThis = (BigInt(sell.min_amount_out) * matchedWeth) / BigInt(sell.amount_in);
    const buyMinForThis = (BigInt(buy.min_amount_out) * matchedUsdg) / BigInt(buy.amount_in);

    if (matchedUsdg < sellMinForThis) {
      console.log(`  [Slippage] Skip sell #${sell.order_id}: output below pro-rated min.`);
      si++;
      continue;
    }
    if (matchedWeth < buyMinForThis) {
      console.log(`  [Slippage] Skip buy #${buy.order_id}: output below pro-rated min.`);
      bi++;
      continue;
    }

    console.log(`  [Match] Pairing sell #${sell.order_id} <-> buy #${buy.order_id} (${matchedWeth} WETH <-> ${matchedUsdg} USDG)`);

    try {
      const hash = await walletClient.writeContract({
        address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
        abi: ORDER_REGISTRY_ABI,
        functionName: "settleMatchedPair",
        args: [BigInt(sell.order_id), BigInt(buy.order_id), matchedWeth, matchedUsdg],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  [Settled On-chain] tx: ${hash}`);
      matchedCount++;

      sellRemaining.set(sell.order_id, sellLeft - matchedWeth);
      buyRemaining.set(buy.order_id, buyLeftUsdg - matchedUsdg);
    } catch (err) {
      console.error(`  [Match Error] Failed settling pair #${sell.order_id} and #${buy.order_id}:`, err);
    }

    if (sellRemaining.get(sell.order_id) === 0n) si++;
    if (buyRemaining.get(buy.order_id) === 0n) bi++;
  }

  return matchedCount;
}
