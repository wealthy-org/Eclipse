// One-shot run of the matcher cycle — for cron-style deployment (Northflank Job, GitHub Actions,
// etc.) instead of `daemon.ts`'s long-running loop. Does exactly one sync -> reveal -> match ->
// net -> re-sync pass, then exits. Schedule this to run periodically instead of keeping a
// container alive 24/7.
import { sql } from "./db.js";
import { syncOrders } from "./syncCore.js";
import { runCommitmentAutoReveal } from "./revealCore.js";
import { runMatching } from "./matchCore.js";
import { runNetImbalanceSettlement } from "./nettingCore.js";

async function main() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] --- Matcher tick ---`);

  console.log("[Tick] Step 1: Syncing orders and commitments from chain...");
  const syncedCount = await syncOrders();
  console.log(`[Tick] Synced ${syncedCount} log(s).`);

  console.log("[Tick] Step 2: Evaluating commitment auto-reveals...");
  const revealedCount = await runCommitmentAutoReveal();
  console.log(`[Tick] Auto-revealed ${revealedCount} commitment(s).`);

  console.log("[Tick] Step 3: Executing matching cycle...");
  const matchedCount = await runMatching();
  console.log(`[Tick] Matched and settled ${matchedCount} pair(s).`);

  console.log("[Tick] Step 4: Checking net imbalance leftovers...");
  const nettedCount = await runNetImbalanceSettlement();
  console.log(`[Tick] Netted and settled ${nettedCount} residual order(s).`);

  if (revealedCount > 0 || matchedCount > 0 || nettedCount > 0) {
    console.log("[Tick] Step 5: Refreshing status post-settlement...");
    await syncOrders();
  }

  console.log("[Tick] Done.");
}

main()
  .catch((err) => {
    console.error("[Tick] Error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
