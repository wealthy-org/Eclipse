"use client";

import { useEffect, useState } from "react";
import { IcWaves } from "./icons";

const WAVE_MS = 30_000;
const SETTLE_MS = 2_500;

type Phase = "open" | "settling";

export default function WaveHud() {
  const [id, setId] = useState<number>(2030);
  const [phase, setPhase] = useState<Phase>("open");
  const [msLeft, setMsLeft] = useState(WAVE_MS);

  // Sync wave ID with real on-chain contract calculation
  useEffect(() => {
    async function syncWaveId() {
      try {
        const res = await fetch("https://rpc.testnet.chain.robinhood.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [
              {
                to: "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad",
                data: "0xc82335c5", // currentWaveId() selector
              },
              "latest",
            ],
          }),
        });
        const json = await res.json();
        if (json?.result) {
          const onchainWave = Number(BigInt(json.result));
          if (onchainWave > 0) setId(onchainWave);
        }
      } catch (e) {}
    }

    syncWaveId();
    const interval = setInterval(syncWaveId, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t0 = Date.now();
    let phaseStart = t0;
    let curPhase: Phase = "open";

    const tick = () => {
      const elapsed = Date.now() - phaseStart;
      if (curPhase === "open") {
        const left = WAVE_MS - elapsed;
        if (left <= 0) {
          curPhase = "settling";
          phaseStart = Date.now();
          setPhase("settling");
          setMsLeft(SETTLE_MS);
        } else {
          setMsLeft(left);
        }
      } else {
        const left = SETTLE_MS - elapsed;
        if (left <= 0) {
          curPhase = "open";
          phaseStart = Date.now();
          setId((v) => v + 1);
          setPhase("open");
          setMsLeft(WAVE_MS);
        } else {
          setMsLeft(left);
        }
      }
    };

    const h = setInterval(tick, 200);
    return () => clearInterval(h);
  }, []);

  const pct = phase === "open" ? Math.max(0, msLeft / WAVE_MS) : 0;
  const circumference = 100;
  const dashoffset = circumference * (1 - pct);
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));

  return (
    <div className="wave-hud" role="status" aria-live="polite">
      <div className="wave-hud-ring">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle className="trk" cx="20" cy="20" r="17" pathLength={circumference} />
          <circle
            className="prg"
            cx="20"
            cy="20"
            r="17"
            pathLength={circumference}
            style={{ strokeDasharray: circumference, strokeDashoffset: phase === "settling" ? 0 : dashoffset }}
          />
        </svg>
        <span>{phase === "settling" ? <IcWaves className="wave-hud-spin" /> : seconds}</span>
      </div>
      <div className="wave-hud-txt">
        <b>Eclipse Wave #{id}</b>
        <small className="mono">
          {phase === "open" ? `Open · closes in 00:${String(seconds).padStart(2, "0")}` : "Matching · netting · settling…"}
        </small>
      </div>
    </div>
  );
}
