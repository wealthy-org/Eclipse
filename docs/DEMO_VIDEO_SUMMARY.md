# Eclipse Protocol — Video Demo & Technical Progress Overview

Dokumen ini merangkum 7 rekaman video demonstrasi teknis untuk **Eclipse Protocol (Confidential Batch Netting & Dark Pool)** yang telah di-deploy dan teruji di **Robinhood Chain Testnet (Chain ID 46630)**.

---

## 📁 Daftar Video Demo & Penjelasan Teknis

### 1. `1.landing page.mp4` — Protocol Overview & Value Proposition
- **Fokus Tampilan:** Halaman beranda utama protokol Eclipse.
- **Poin Kunci:**
  - Menjelaskan masalah utama DEX publik: MEV sandwich attack, information leakage, dan tingginya biaya gas AMM.
  - Memperkenalkan solusi Eclipse: **Private Batch Auctions** dengan siklus wave 30 detik yang menyilangkan order buy/sell secara bilateral dengan zero price impact sebelum melempar sisa residual ke Uniswap v4.
  - Desain gelap institusional (high-end dark mode) dengan integrasi wallet Web3 live.

---

### 2. `2. market.mp4` — Live On-Chain Trading Terminal (`WETH / USDG`)
- **Fokus Tampilan:** Terminal eksekusi trade on-chain langsung ke token USDG & WETH.
- **Poin Kunci:**
  - **Dark Mode Commitment Execution:** Menunjukkan input order di mana nominal dan arah disamarkan via client-side salt hashing (`computeCommitment`).
  - **Interaksi Wallet Nyata:** Transaksi approve token dan `submitCommitment()` diproses langsung di smart contract [`EclipseOrderRegistry.sol`](https://testnet.explorer.chain.robinhood.com/address/0xA697AD15EB193c7e23c4208606587c2FEfDf92ad).
  - **Direct Block Explorer Link:** Tautan Tx Hash dapat langsung diklik membuka Robinhood Chain Explorer, membuktikan parameter `tokenOut` dan `minAmountOut` terselubung (`0x000...` dan `0`) sehingga 100% kebal dari front-running mempool.
  - **Tabel "My Orders":** Order tercatat secara on-chain dan langsung muncul di riwayat pengguna.

---

### 3. `3. wave.mp4` — Dynamic Dual-Sided Netting Engine (`/waves`)
- **Fokus Tampilan:** Dashboard telemetri batch auction aktif.
- **Poin Kunci:**
  - **Live Forming Wave Countdown:** Indikator siklus batch 30 detik yang tersinkronisasi dengan blok on-chain.
  - **Fluid Split Gauge Bar:** Visualisasi proporsional antara **Zero-Gas Internal Cross** (gradien mint/violet) dan **Net Residual Imbalance** (amber).
  - **Micro-Metric Est. Gas Saved:** Menghitung estimasi biaya gas jaringan yang berhasil dihemat trader secara riil karena order dipadankan secara internal tanpa menyentuh AMM.
  - **Settled Waves History:** Log histori wave batch terdahulu lengkap dengan Netting Efficiency %, ZK Commitment Root, dan Tx Hash eksekusi.

---

### 4. `4. privacy.mp4` — MEV Leakage & Threat Simulator (`/privacy`)
- **Fokus Tampilan:** Halaman edukasi keamanan dan perbandingan proteksi order.
- **Poin Kunci:**
  - **Side-by-Side Comparison:**
    - *Sisi Merah (Standard Public DEX):* Detail trader, arah token, dan batas slippage terbuka transparan di mempool sehingga rentan diserang bot sandwich (rugi ~15 bps).
    - *Sisi Hijau (Eclipse Active Shielded Protection):* Parameter batas tersembunyi hingga wave cutoff, dieksekusi seragam pada clearing price batch.
  - Matriks arsitektur bertingkat (*Layer 1 Batch Auctions* $\rightarrow$ *Layer 4 Shielded Funding*).

---

### 5. `5.market list.mp4` — Supported Markets & Asset Classes (`/markets`)
- **Fokus Tampilan:** Tampilan 3 Kartu Pasar Utama (Supported Markets).
- **Poin Kunci:**
  1. **`WETH / USDG`**: Crypto native asset yang di-route via Uniswap v4 `EclipseHook` (5 bps protocol fee).
  2. **`NVDA / USDG`**: **Tokenized Equity · 24/7 Dark Pool** (Aset RWA saham US berbasis token dengan netting batch).
  3. **`PONS / USDG`**: Graduated community token yang diamankan via `EclipseExecutorRoute`.
  - Dilengkapi sparkline kurva kontinu 24 jam dan visualisasi cadangan likuiditas pool.

---

### 6. `6. Smart Contract Test Suite .mp4` — Foundry Invariant Rigor
- **Fokus Tampilan:** Terminal CLI menjalankan suite unit test smart contract (`npm run test:demo`).
- **Poin Kunci:**
  - Menjalankan 6 test suite mencakup seluruh kontrak on-chain:
    - `EclipseOrderRegistryTest`: 17 tests (escrow, cancel refund, commitment hiding, bilateral internal netting `settleMatchedPair`).
    - `EclipseHookTest`: 8 tests (Uniswap v4 permissions `beforeSwap`, `afterSwapReturnDelta`, fee 5 bps, dynamic wave lock).
    - `EclipsePrivateSettlementTest`: 2 tests (klaim payout stealth & proteksi nullifier anti double-spend).
    - `EclipseBatchVerifierTest` & `SpecterEclipseAdapterTest`.
  - **Hasil:** Total **33 passed, 0 failed (100% lulus)**.

---

### 7. `7. Zero-Knowledge Circuit Prover (Rust zkVM).mp4` — Mathematical Proof
- **Fokus Tampilan:** Terminal CLI membuktikan integritas ZK circuit (`npm run zk:demo`).
- **Poin Kunci:**
  - Menjalankan guest program zkVM di folder `/zk` (`eclipse_zk_lib`).
  - Verifikasi otomatis terhadap 5 Invariant Batch:
    1. Zero duplicate order IDs dalam 1 wave.
    2. Validitas deadline order terhadap block timestamp.
    3. Merkle commitment root inclusion.
    4. Bilateral crossing & uniform clearing price.
    5. Konservasi aset Policy A (Gross Volume == Matched Cross + Net Residual).
  - Output *Public Journal Synthesized* membuktikan batch valid secara kriptografis tanpa mengekspos isi order individual ke publik.

---

## 📊 Ringkasan Status Progres Proyek
- **Smart Contracts (Solidity/Foundry):** 100% Selesai & Deployed di Robinhood Chain Testnet (Chain ID 46630).
- **ZK Circuit (Rust zkVM):** Invariant guest program teruji 100%.
- **Background Matcher (Railway):** Daemon solver aktif 24/7 memproses order log dan auto-reveal.
- **Web App (Next.js 16):** Production ready dengan wallet connect asli, direct explorer linking, dan UI RWA institusional.
- **Kesiapan Menuju Mainnet:** **~88% – 90%** (Tinggal menunggu security audit pihak ketiga independen & multi-sig governance).
