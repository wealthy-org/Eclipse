// Automated internal matching CLI (MATCHING_MODEL.md "Policy A"):
// Uses core matching logic from matchCore.ts to settle matched pairs on-chain.
import { sql } from "./db.js";
import { runMatching } from "./matchCore.js";

async function main() {
  console.log("[CLI Matcher] Starting internal batch matching...");
  const count = await runMatching();
  console.log(`[CLI Matcher] Done. ${count} pair(s) settled this run.`);
  await sql.end();
}

main().catch((err) => {
  console.error("[CLI Matcher Error]:", err);
  process.exit(1);
});
