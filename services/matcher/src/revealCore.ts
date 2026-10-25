// Phase 2: Auto-reveal commitment handler
// Evaluates unrevealed commitments during wave cutoff, calls revealCommitment on-chain
// using the escrowed preimages, transforming Locked commitments into Open batch orders.

import { sql } from "./db.js";
import { walletClient, publicClient, ECLIPSE_ORDER_REGISTRY_ADDRESS } from "./chain.js";
import { ORDER_REGISTRY_ABI } from "./abi.js";

interface DbCommitment {
  commitment: string;
  order_id: string | null;
  owner: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  min_amount_out: string;
  expiry: string;
  secret: string;
  wave_id: string;
  revealed: boolean;
}

export async function runCommitmentAutoReveal(): Promise<number> {
  if (!walletClient) {
    console.warn("[AutoReveal] Skipping auto-reveal: walletClient not initialized.");
    return 0;
  }

  // Find unrevealed commitments that have an order_id assigned from on-chain event sync
  // and valid escrowed preimage fields
  const unrevealed = await sql<DbCommitment[]>`
    select * from commitments 
    where revealed = false 
      and order_id is not null 
      and secret != '' 
      and token_out != ''
    order by created_at asc
  `;

  if (unrevealed.length === 0) {
    return 0;
  }

  console.log(`[AutoReveal] Found ${unrevealed.length} commitment(s) eligible for reveal.`);
  let revealedCount = 0;

  for (const c of unrevealed) {
    try {
      const orderId = BigInt(c.order_id!);
      const tokenOut = c.token_out as `0x${string}`;
      const minAmountOut = BigInt(c.min_amount_out);
      const secret = c.secret as `0x${string}`;

      console.log(`[AutoReveal] Submitting on-chain reveal for order #${orderId}...`);

      const hash = await walletClient.writeContract({
        address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
        abi: ORDER_REGISTRY_ABI,
        functionName: "revealCommitment",
        args: [orderId, tokenOut, minAmountOut, secret],
      });

      console.log(`[AutoReveal] Tx sent: ${hash}. Waiting for receipt...`);
      await publicClient.waitForTransactionReceipt({ hash });

      // Mark as revealed in DB
      await sql`
        update commitments set revealed = true where commitment = ${c.commitment}
      `;

      // Update orders table: set token_out, min_amount_out, and status = 0 (Open)
      await sql`
        update orders 
        set token_out = ${tokenOut}, min_amount_out = ${minAmountOut.toString()}, status = 0, updated_at = now() 
        where order_id = ${orderId.toString()}
      `;

      console.log(`[AutoReveal] Order #${orderId} successfully revealed on-chain and transitioned to Open.`);
      revealedCount++;
    } catch (err) {
      console.error(`[AutoReveal] Failed to reveal commitment for order #${c.order_id}:`, err);
    }
  }

  return revealedCount;
}
