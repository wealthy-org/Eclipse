import { sql } from "./db.js";

/**
 * Neon Free Tier Storage & Row Optimization:
 * Periodically deletes old stale data that is no longer needed:
 * 1. Revealed/settled commitments older than 3 days
 * 2. Settled or cancelled orders older than 7 days
 * 3. Old completed/failed wave aggregates older than 14 days
 */
export async function runDatabaseCleanup(): Promise<{
  deletedCommitments: number;
  deletedOrders: number;
  deletedWaves: number;
}> {
  try {
    // 1. Delete revealed commitments older than 3 days
    const delCommitments = await sql`
      delete from commitments
      where (revealed = true or expiry < extract(epoch from now() - interval '3 days'))
      and created_at < now() - interval '3 days'
      returning commitment
    `;

    // 2. Delete cancelled or settled orders older than 7 days (status 1 = Cancelled, 3 = Settled)
    const delOrders = await sql`
      delete from orders
      where status in (1, 3)
      and updated_at < now() - interval '7 days'
      returning order_id
    `;

    // 3. Delete old settled waves older than 14 days
    const delWaves = await sql`
      delete from waves
      where status in ('settled', 'executed', 'failed')
      and created_at < now() - interval '14 days'
      returning wave_id
    `;

    const result = {
      deletedCommitments: delCommitments.length,
      deletedOrders: delOrders.length,
      deletedWaves: delWaves.length,
    };

    if (result.deletedCommitments > 0 || result.deletedOrders > 0 || result.deletedWaves > 0) {
      console.log(
        `[Cleanup] Pruned stale rows: ${result.deletedCommitments} commitments, ${result.deletedOrders} orders, ${result.deletedWaves} waves.`
      );
    }

    return result;
  } catch (err) {
    console.error("[Cleanup] Error during database pruning:", err);
    return { deletedCommitments: 0, deletedOrders: 0, deletedWaves: 0 };
  }
}
