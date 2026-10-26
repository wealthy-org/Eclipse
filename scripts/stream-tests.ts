import { spawn } from "child_process";
import readline from "readline";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.clear();
  console.log("\x1b[1;36m==> Eclipse Protocol — Foundry Test Suite Runner\x1b[0m");
  console.log("\x1b[90mRunning forge test with live invariant streaming...\x1b[0m\n");
  await delay(800);

  const proc = spawn("forge", ["test", "-vvv"], {
    cwd: process.cwd() + "/contracts",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const rl = readline.createInterface({
    input: proc.stdout,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.includes("[PASS]")) {
      // Highlight green with micro-delay for dramatic verification effect
      console.log(`\x1b[1;32m✓\x1b[0m \x1b[32m${line.trim()}\x1b[0m`);
      await delay(120);
    } else if (line.includes("Ran ") && line.includes("test")) {
      console.log(`\n\x1b[1;34m:: ${line.trim()}\x1b[0m`);
      await delay(200);
    } else if (line.includes("Suite result:")) {
      console.log(`  \x1b[1;30;42m OK \x1b[0m \x1b[90m${line.trim()}\x1b[0m`);
      await delay(180);
    } else if (line.includes("tests passed")) {
      console.log(`\n\x1b[1;32m══════════════════════════════════════════════════════════════\x1b[0m`);
      console.log(`\x1b[1;32m🎉 ${line.trim()}\x1b[0m`);
      console.log(`\x1b[1;32m══════════════════════════════════════════════════════════════\x1b[0m\n`);
    } else if (line.trim().length > 0 && !line.includes("Compiling")) {
      console.log(`\x1b[90m${line}\x1b[0m`);
      await delay(40);
    }
  }
}

run().catch(console.error);
