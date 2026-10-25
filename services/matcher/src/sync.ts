// Read-only indexer CLI: mirrors EclipseOrderRegistry's on-chain orders into NeonDB.
import { sql } from "./db.js";
import { syncOrders } from "./syncCore.js";

async function main() {
  console.log("[CLI Sync] Starting on-chain orders & commitments synchronization...");
  const count = await syncOrders();
  console.log(`[CLI Sync] Synchronization complete. ${count} item(s) processed.`);
  await sql.end();
}

main().catch((err) => {
  console.error("[CLI Sync Error]:", err);
  process.exit(1);
});
