import { syncOrders } from "./syncCore.js";
import { runCommitmentAutoReveal } from "./revealCore.js";
import { runMatching } from "./matchCore.js";
import { runNetImbalanceSettlement } from "./nettingCore.js";

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "15000", 10);

let running = true;

async function tick() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] --- Running Matcher Daemon Cycle ---`);

  try {
    // Step 1: Sync new orders & commitments from on-chain event logs to DB
    console.log("[Daemon] Step 1: Syncing orders and commitments from chain...");
    const syncedCount = await syncOrders();
    console.log(`[Daemon] Synced ${syncedCount} log(s).`);

    // Step 2: Phase 2 Auto-Reveal commitments at wave cutoff
    console.log("[Daemon] Step 2: Evaluating commitment auto-reveals...");
    const revealedCount = await runCommitmentAutoReveal();
    console.log(`[Daemon] Auto-revealed ${revealedCount} commitment(s).`);

    // Step 3: Attempt internal batch matching for opposing pairs
    console.log("[Daemon] Step 3: Executing matching cycle...");
    const matchedCount = await runMatching();
    console.log(`[Daemon] Matched and settled ${matchedCount} pair(s).`);

    // Step 4: Check and settle net-imbalance for uncrossed leftover orders
    console.log("[Daemon] Step 4: Checking net imbalance leftovers...");
    const nettedCount = await runNetImbalanceSettlement();
    console.log(`[Daemon] Netted and settled ${nettedCount} residual order(s).`);

    // Step 5: If any transactions succeeded on-chain, re-sync to update DB status immediately
    if (revealedCount > 0 || matchedCount > 0 || nettedCount > 0) {
      console.log("[Daemon] Step 5: Refreshing status post-settlement...");
      await syncOrders();
    }
  } catch (err) {
    console.error("[Daemon] Error in cycle:", err);
  }
}

async function loop() {
  console.log(`=== Eclipse Matcher Daemon started ===`);
  console.log(`Polling interval: ${POLL_INTERVAL_MS}ms`);

  while (running) {
    await tick();
    if (!running) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGINT", () => {
  console.log("\n[Daemon] Gracefully shutting down...");
  running = false;
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Daemon] Gracefully shutting down...");
  running = false;
  process.exit(0);
});

loop();
