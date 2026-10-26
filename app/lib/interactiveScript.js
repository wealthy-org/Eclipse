(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const NS = 'http://www.w3.org/2000/svg';
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
let RM = mq.matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const E_ = {
  out: t => 1 - Math.pow(1 - t, 3),
  io: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: t => t * t * t,
  lin: t => t
};
function tween(ms, fn, e = E_.io) {
  return new Promise(res => {
    if (RM || ms <= 0 || document.hidden) { fn(1); res(); return; }
    const t0 = performance.now();
    const step = n => { const p = clamp((n - t0) / ms, 0, 1); fn(e(p)); if (p < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}

/* ---------- icons ---------- */
const IC = {
  order: '<path d="M6.5 3.5h7l4.5 4.5v12.5h-11.5z"/><path class="fold" d="M13.5 3.5V8H18"/><path class="l1" d="M9.5 12.5h5"/><path class="l2" d="M9.5 16h3"/>',
  wave: '<path class="a1" d="M4 17a8 8 0 0 1 16 0"/><path class="a2" d="M7.6 17a5.4 5.4 0 0 1 10.8 0"/><path class="a3" d="M11.2 17a2.8 2.8 0 0 1 5.6 0"/>',
  match: '<path class="p1" d="M3 7h5.5c2.2 0 3.5 1.6 3.5 5"/><path class="p2" d="M21 17h-5.5c-2.2 0-3.5-1.6-3.5-5"/><circle class="dot" cx="12" cy="12" r="1.3"/>',
  net: '<path class="n1" d="M3 6c4.5 0 6 6 10 6"/><path class="n2" d="M3 12h10"/><path class="n3" d="M3 18c4.5 0 6-6 10-6"/><path class="arrow" d="M13 12h8m-3-3 3 3-3 3"/>',
  settle: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path class="chk" d="M8.6 12.3l2.3 2.3 4.6-4.9"/>',
  lattice: '<path d="M5 4v16M12 4v16M19 4v16"/><path class="x" d="M5 8l7 4 7-4M5 16l7-4 7 4"/><circle class="nd" cx="12" cy="12" r="1.5"/><circle class="nd" cx="5" cy="8" r="1.2"/><circle class="nd" cx="19" cy="16" r="1.2"/>',
  swap: '<path d="M8 4v15m0 0-3.5-3.5M8 19l3.5-3.5"/><path d="M16 20V5m0 0-3.5 3.5M16 5l3.5 3.5"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5V9H9"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17h.01"/>',
  gate: '<path class="gw" d="M2.5 12h4M17.5 12h4"/><path d="M12 5.5l6.5 6.5-6.5 6.5L5.5 12z"/><circle class="gd" cx="12" cy="12" r="1.6"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  dash: '<path d="M7 12h10"/>'
};
const icon = (n, c = '') => `<svg class="ic ic-${n} ${c}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n]}</svg>`;
$$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
$$('[data-gicon]').forEach(g => { g.innerHTML = IC[g.dataset.gicon]; g.setAttribute('class', 'ic ic-' + g.dataset.gicon); });

/* ---------- formatting ---------- */
const NF = {};
const fmt = (n, d = 2) => (NF[d] || (NF[d] = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }))).format(n);
const short = n => n >= 1e6 ? '$' + fmt(n / 1e6, 2) + 'M' : n >= 1e4 ? '$' + fmt(n / 1e3, 1) + 'K' : '$' + fmt(n, 0);
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const pct = (x, d = 1) => fmt(x * 100, d) + '%';

/* ---------- token icons (real CDN assets, tinted to match theme) ---------- */
const TOKEN_ICON = {
  // real ETH mark · cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@0.18.1
  WETH: '<svg viewBox="0 0 32 32" class="tok-svg"><g fill="none" fill-rule="evenodd"><circle cx="16" cy="16" r="16" fill="#627EEA"/><g fill="#FFF" fill-rule="nonzero"><path fill-opacity=".602" d="M16.498 4v8.87l7.497 3.35z"/><path d="M16.498 4L9 16.22l7.498-3.35z"/><path fill-opacity=".602" d="M16.498 21.968v6.027L24 17.616z"/><path d="M16.498 27.995v-6.028L9 17.616z"/><path fill-opacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z"/><path fill-opacity=".602" d="M9 16.22l7.498 4.353v-7.701z"/></g></g></svg>',
  // generic stablecoin mark (USDG is a simulated asset, no real token to depict) · lucide-static@0.399.0 circle-dollar-sign
  USDG: '<svg viewBox="0 0 24 24" class="tok-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>',
  // generic "equity" mark for the illustrative Stock Token concept · lucide-static@0.399.0 trending-up
  NVDA: '<svg viewBox="0 0 24 24" class="tok-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  // generic "launch" mark for the illustrative graduated-launchpad token · lucide-static@0.399.0 rocket
  PONS: '<svg viewBox="0 0 24 24" class="tok-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'
};
const tokGlyph = (sym, cls) => `<span class="glyph ${cls}">${TOKEN_ICON[sym] || sym[0]}</span>`;

/* ---------- market model (simulated) ---------- */
const TOK = {
  USDG: { show: 2, inDec: 2, min: 50, glyph: 'U', cls: 'g-usdg', name: 'USDG', sub: 'Dollar stable · simulated' },
  WETH: { show: 4, inDec: 6, min: 0.02, glyph: 'W', cls: 'g-weth', name: 'WETH', sub: 'Wrapped Ether · simulated' }
};
const EXTRA = [
  { sym: 'NVDA', sub: 'Stock Token', tag: 'Research' },
  { sym: 'PONS', sub: 'Graduated Pons token', tag: 'Planned' }
];
const POOL = { WETH: 4200, USDG: 13198500 };
const MID = POOL.USDG / POOL.WETH; // 3,142.50
const POOL_FEE = 0.0005, DM_FEE = 0.0005, WAVE_MS = 30000;
const ta = (n, t) => fmt(n, TOK[t].show) + ' ' + t;
function cpmm(a, tin, tout) { const x = a * (1 - POOL_FEE); return x * POOL[tout] / (POOL[tin] + x); }
const usdOf = (a, t) => (t === 'USDG' ? a : a * MID);

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function waveOrders(id) {
  const r = rng(id * 9973 + 17), n = 7 + Math.floor(r() * 8), out = [];
  for (let i = 0; i < n; i++) {
    const usd = Math.round((500 + Math.pow(r(), 1.7) * 23000) * 100) / 100;
    out.push(r() < 0.53 ? { side: 'buy', amt: usd } : { side: 'sell', amt: Math.round(usd / MID * 1e4) / 1e4 });
  }
  return out;
}
function hex(seed, len = 64) { let h = (2166136261 ^ (seed * 2654435761)) >>> 0, s = ''; while (s.length < len) { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; s += h.toString(16).padStart(8, '0'); } return '0x' + s.slice(0, len); }

/* buy = USDG→WETH (amt in USDG), sell = WETH→USDG (amt in WETH) */
function settle(orders) {
  let B = 0, S = 0;
  orders.forEach(o => { if (o.side === 'buy') B += o.amt; else S += o.amt; });
  const SV = S * MID, matched = Math.min(B, SV);
  let net, buyTot, sellTot;
  if (B >= SV) {
    const inA = B - SV, outA = inA > 0 ? cpmm(inA, 'USDG', 'WETH') : 0;
    net = { side: 'buy', tin: 'USDG', tout: 'WETH', amtIn: inA, amtOut: outA, usd: inA, px: outA ? inA / outA : MID };
    buyTot = S + outA; sellTot = SV;
  } else {
    const inA = (SV - B) / MID, outA = cpmm(inA, 'WETH', 'USDG');
    net = { side: 'sell', tin: 'WETH', tout: 'USDG', amtIn: inA, amtOut: outA, usd: inA * MID, px: outA / inA };
    buyTot = B / MID; sellTot = B + outA;
  }
  let feeUsd = 0;
  const fills = orders.map(o => {
    const gross = o.side === 'buy' ? (B ? o.amt / B * buyTot : 0) : (S ? o.amt / S * sellTot : 0);
    feeUsd += usdOf(gross * DM_FEE, o.side === 'buy' ? 'WETH' : 'USDG');
    return gross * (1 - DM_FEE);
  });
  const gross = B + SV;
  return {
    n: orders.length, B, S, SV, matched, gross, eff: gross ? 2 * matched / gross : 0, net, fills,
    buyPx: buyTot ? B / buyTot : MID, sellPx: S ? sellTot / S : MID,
    buyOut: buyTot, sellOut: sellTot, feeUsd, poolFeeUsd: net.usd * POOL_FEE
  };
}

/* ---------- wave engine ---------- */
const W = { cur: null, hist: [] };
let openWaiters = [];
const now = () => Date.now();
function makeWave(id, opensAt) { return { id, market: 'WETH / USDG', orders: waveOrders(id), state: 'OPEN', opensAt, closesAt: opensAt + WAVE_MS, res: null, user: null, ff: null, claimed: false }; }
(function initWaves() {
  const t = now();
  for (let id = 184; id >= 179; id--) { const w = makeWave(id, t - (185 - id) * WAVE_MS - 4000); w.state = 'SETTLED'; w.res = settle(w.orders); W.hist.push(w); }
  W.cur = makeWave(185, t - 6000);
})();
function remaining(w) {
  if (w.state !== 'OPEN') return 0;
  if (w.ff) { const p = clamp((now() - w.ff.t0) / w.ff.dur, 0, 1); return w.ff.from * (1 - E_.io(p)); }
  return Math.max(0, w.closesAt - now());
}
function whenOpen() { return (W.cur.state === 'OPEN' && !W.cur.claimed) ? Promise.resolve() : new Promise(r => openWaiters.push(r)); }
function finishWave(w) {
  W.hist.unshift(w); if (W.hist.length > 14) W.hist.length = 14;
  W.cur = makeWave(w.id + 1, now());
  waveChanged(w.id);
  const ws = openWaiters; openWaiters = []; ws.forEach(f => f());
}
async function autoSettle(w) {
  const ap = $('#aperture');
  w.state = 'LOCKED'; ap.classList.add('active', 'locked'); waveChanged();
  await sleep(700); w.state = 'MATCHING'; waveChanged();
  await sleep(900); w.state = 'EXECUTING'; waveChanged(); flashEndpoint();
  await sleep(800); w.res = settle(w.orders); w.state = 'SETTLED';
  ap.classList.remove('active', 'locked'); finishWave(w);
}
setInterval(() => { const w = W.cur; if (w.state === 'OPEN' && !w.claimed && remaining(w) <= 0) autoSettle(w); }, 200);
function flashEndpoint() {
  const ep = $('#endpoint');
  $$('.rail-line').forEach(rl => { rl.classList.remove('flow'); void rl.offsetWidth; rl.classList.add('flow'); });
  ep.classList.add('lit'); setTimeout(() => ep.classList.remove('lit'), 1300);
}

/* ---------- terminal ---------- */
const T = { started: false, mode: 'dark', tin: 'USDG', tout: 'WETH', slip: 0.5, bal: { USDG: 0, WETH: 0 }, busy: false, last: null, snap: null };
const term = $('#terminal'), amountIn = $('#amountIn'), amountOut = $('#amountOut'), cta = $('#cta'), ctaLabel = $('#ctaLabel');
const live = $('#live');
const announce = m => { live.textContent = ''; setTimeout(() => { live.textContent = m; }, 40); };

function tokBtn(t) { return `${tokGlyph(t, TOK[t].cls)}<span>${t}</span>${icon('chev')}`; }
function setLabel(txt) {
  if (ctaLabel.textContent === txt) return;
  if (RM) { ctaLabel.textContent = txt; return; }
  ctaLabel.classList.add('out');
  setTimeout(() => { ctaLabel.textContent = txt; ctaLabel.classList.remove('out'); }, 140);
}
function animNum(el, to, d) {
  const from = el._v == null ? 0 : el._v; el._v = to;
  cancelAnimationFrame(el._raf);
  if (RM || Math.abs(to - from) < 1e-12) { el.textContent = fmt(to, d); return; }
  const t0 = performance.now(), dur = 380;
  const st = n => { const p = clamp((n - t0) / dur, 0, 1); el.textContent = fmt(lerp(from, to, E_.out(p)), d); if (p < 1) el._raf = requestAnimationFrame(st); };
  el._raf = requestAnimationFrame(st);
}
function quote() {
  const a = parseFloat(amountIn.value);
  if (!(a > 0)) return null;
  if (T.mode === 'public') {
    const out = cpmm(a, T.tin, T.tout), spot = T.tin === 'USDG' ? a / MID : a * MID;
    return { a, out, impact: 1 - out / spot, px: T.tin === 'USDG' ? a / out : out / a };
  }
  return { a, out: T.tin === 'USDG' ? a / MID * (1 - DM_FEE) : a * MID * (1 - DM_FEE) };
}
function validate() {
  const raw = amountIn.value, a = parseFloat(raw), tk = TOK[T.tin];
  if (!T.started) return { ok: false, start: true, label: 'Start demo' };
  if (raw === '' || !(a > 0)) return { ok: false, label: 'Enter an amount', msg: '' };
  if (a < tk.min) return { ok: false, label: 'Below minimum order', msg: `Minimum ${fmt(tk.min, T.tin === 'USDG' ? 0 : 2)} ${T.tin}` };
  if (a > T.bal[T.tin] + 1e-9) return { ok: false, label: 'Insufficient demo balance', msg: 'Exceeds demo balance' };
  return { ok: true, label: T.mode === 'dark' ? 'Submit private order' : 'Swap now' };
}
function render() {
  const q = quote(), v = validate(), dk = T.mode === 'dark';
  $('#tokIn').innerHTML = tokBtn(T.tin); $('#tokIn').setAttribute('aria-label', `Pay token ${T.tin}. Change token`);
  $('#tokOut').innerHTML = tokBtn(T.tout); $('#tokOut').setAttribute('aria-label', `Receive token ${T.tout}. Change token`);
  $('#balIn').textContent = T.started ? ta(T.bal[T.tin], T.tin) : '–';
  $('#balOut').textContent = T.started ? ta(T.bal[T.tout], T.tout) : '–';
  $('#maxBtn').disabled = !T.started || T.busy;
  const d = TOK[T.tout].show;
  if (q) { amountOut.classList.remove('zero'); animNum(amountOut, q.out, d); }
  else { amountOut.classList.add('zero'); amountOut._v = 0; amountOut.textContent = fmt(0, d); }
  const a = parseFloat(amountIn.value) || 0;
  $('#inUsd').textContent = '≈ $' + fmt(usdOf(a, T.tin), 2);
  $('#minOut').textContent = q ? ta(q.out * (1 - T.slip / 100), T.tout) : '–';
  $('#outLabel').textContent = dk ? 'You receive · at mid' : 'You receive · estimated';
  if (dk) {
    $('#rateLine').textContent = `Mid 1 WETH = ${fmt(MID, 2)} USDG`;
    $('#impact').textContent = 'Clears after wave';
    $('#execLine').textContent = `Eclipse Wave #${(W.cur.claimed && !T.busy) ? W.cur.id + 1 : W.cur.id}`;
    $('#feeLine').textContent = '5 bps + pool fee on net';
  } else {
    $('#rateLine').textContent = q ? `Pool 1 WETH = ${fmt(q.px, 2)} USDG` : `Pool 1 WETH ≈ ${fmt(MID, 2)} USDG`;
    $('#impact').textContent = q ? `Impact ${pct(q.impact, 2)}` : '';
    $('#execLine').textContent = 'Immediate · public swap';
    $('#feeLine').textContent = 'Pool 0.05%';
  }
  const showErr = v.msg && amountIn.value !== '';
  $('#amountErr').textContent = showErr ? v.msg : '';
  $('#fieldIn').classList.toggle('bad', !!showErr);
  if (T.busy) return;
  setLabel(v.label);
  cta.setAttribute('aria-disabled', (!v.ok && !v.start) ? 'true' : 'false');
}
function setMode(m, focus) {
  if (T.busy || T.mode === m) return;
  T.mode = m; term.dataset.mode = m;
  $$('#modeGroup [role=radio]').forEach(b => { const on = b.dataset.mode === m; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $('#wavePanel').classList.toggle('open', m === 'dark');
  hideResult();
  render();
  announce(m === 'dark' ? 'Dark mode. Orders join the next Eclipse Wave.' : 'Public mode. Orders execute immediately as a public swap.');
}
$$('#modeGroup [role=radio]').forEach(b => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
  b.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setMode(T.mode === 'dark' ? 'public' : 'dark', true); }
  });
});
amountIn.addEventListener('input', () => {
  let v = amountIn.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  const [i, f] = v.split('.'); const dec = TOK[T.tin].inDec;
  if (f !== undefined && f.length > dec) v = i + '.' + f.slice(0, dec);
  if (v.startsWith('.')) v = '0' + v;
  if (/^0\d/.test(v)) v = v.replace(/^0+(?=\d)/, '');
  if (v !== amountIn.value) amountIn.value = v;
  if (!T.busy) hideResult();
  render();
});
amountIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
$('#maxBtn').addEventListener('click', () => {
  if (!T.started || T.busy) return;
  const b = T.bal[T.tin], dec = TOK[T.tin].inDec, f = Math.pow(10, dec);
  amountIn.value = String(Math.floor(b * f) / f); hideResult(); render(); amountIn.focus();
});
let dirRot = 0;
$('#dirBtn').addEventListener('click', () => {
  if (T.busy) return;
  const q = quote();
  [T.tin, T.tout] = [T.tout, T.tin];
  dirRot += 180; $('#dirBtn .ic').style.transform = `rotate(${dirRot}deg)`;
  if (q) { const dec = TOK[T.tin].inDec, f = Math.pow(10, Math.min(dec, T.tin === 'USDG' ? 2 : 4)); amountIn.value = String(Math.floor(q.out * f) / f); }
  amountOut._v = 0; hideResult(); render();
  announce(`Now paying ${T.tin}, receiving ${T.tout}`);
});
/* slippage */
const slipBtns = $$('#slipGroup [data-slip]'), slipCustom = $('#slipCustom');
function setSlip(v, fromCustom) {
  T.slip = v;
  slipBtns.forEach(b => b.setAttribute('aria-pressed', !fromCustom && parseFloat(b.dataset.slip) === v));
  $('#slipCustomWrap').classList.toggle('on', !!fromCustom);
  if (!fromCustom) slipCustom.value = '';
  render();
}
slipBtns.forEach(b => b.addEventListener('click', () => { if (!T.busy) setSlip(parseFloat(b.dataset.slip)); }));
slipCustom.addEventListener('input', () => {
  let v = slipCustom.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  if (v.split('.').length > 2) v = v.slice(0, v.lastIndexOf('.'));
  slipCustom.value = v.slice(0, 4);
  const n = parseFloat(v);
  if (n > 0) setSlip(clamp(n, 0.05, 5), true); else if (v === '') setSlip(0.5);
});
slipCustom.addEventListener('blur', () => { const n = parseFloat(slipCustom.value); if (n > 0) slipCustom.value = String(clamp(n, 0.05, 5)); });

/* token popover */
const pop = $('#tokPop'); let popSide = null, popBtn = null;
function openPop(btn) {
  if (T.busy) return;
  popSide = btn.dataset.side; popBtn = btn;
  const cur = popSide === 'in' ? T.tin : T.tout;
  pop.innerHTML = ['USDG', 'WETH'].map(s => `<button type="button" class="opt" role="option" data-sym="${s}" aria-selected="${s === cur}">${tokGlyph(s, TOK[s].cls)}<span>${s}<small>${TOK[s].sub}</small></span></button>`).join('') +
    EXTRA.map(x => `<button type="button" class="opt" role="option" aria-disabled="true" aria-selected="false" data-sym="${x.sym}">${tokGlyph(x.sym, 'g-off')}<span>${x.sym}<small>${x.sub}</small></span><em>${x.tag}</em></button>`).join('');
  const tr = term.getBoundingClientRect(), br = btn.getBoundingClientRect();
  pop.style.top = (br.bottom - tr.top + 8) + 'px';
  pop.style.right = (tr.right - br.right) + 'px';
  pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  const sel = pop.querySelector('[aria-selected=true]'); (sel || pop.querySelector('.opt')).focus();
}
function closePop(refocus) { if (pop.hidden) return; pop.hidden = true; popBtn && popBtn.setAttribute('aria-expanded', 'false'); if (refocus && popBtn) popBtn.focus(); }
function pick(sym) {
  if (!TOK[sym]) return;
  const other = popSide === 'in' ? T.tout : T.tin;
  if (sym === other) { [T.tin, T.tout] = [T.tout, T.tin]; amountIn.value = ''; }
  else if (popSide === 'in') T.tin = sym; else T.tout = sym;
  amountOut._v = 0; hideResult(); closePop(true); render();
}
['#tokIn', '#tokOut'].forEach(id => $(id).addEventListener('click', e => { e.stopPropagation(); pop.hidden ? openPop(e.currentTarget) : closePop(true); }));
pop.addEventListener('click', e => { e.stopPropagation(); const o = e.target.closest('.opt'); if (o && o.getAttribute('aria-disabled') !== 'true') pick(o.dataset.sym); });
pop.addEventListener('keydown', e => {
  const opts = $$('.opt', pop), i = opts.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
  else if (e.key === 'Escape') { e.preventDefault(); closePop(true); }
  else if (e.key === 'Tab') closePop(false);
});
document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) closePop(false); });

/* track + result */
const STEPS = { dark: ['Order queued', 'Wave locked', 'Matching', 'Executing', 'Settled'], public: ['Signed', 'Executing', 'Settled'] };
function buildTrack(mode) {
  const s = STEPS[mode], tr = $('#track');
  tr.style.gridTemplateColumns = `repeat(${s.length},minmax(0,1fr))`;
  tr.innerHTML = s.map((x, i) => `<div class="step${i === s.length - 1 ? ' final' : ''}"><i></i><span>${x}</span></div>`).join('');
  $('#trackNote').innerHTML = mode === 'dark' ? '<span>Eclipse Wave in progress</span><span>Demo runs faster than real time</span>' : '<span>Public swap</span><span>Simulated execution</span>';
}
function setStep(i, mode) {
  $$('#track .step').forEach((el, k) => { el.classList.toggle('done', k < i); el.classList.toggle('on', k === i); });
  const label = STEPS[mode][i];
  setLabel(label + (i < STEPS[mode].length - 1 ? '…' : ''));
  announce(label);
}
function hideResult() { $('#resultWrap').classList.remove('open'); if (!T.busy) $('#trackWrap').classList.remove('open'); }
function showResult(html, cls) {
  const r = $('#result'); r.className = 'result ' + (cls || ''); r.innerHTML = html;
  $('#resultWrap').classList.add('open');
}

function startDemo() {
  T.started = true; T.bal = { USDG: 25000, WETH: 8 };
  if (!amountIn.value) amountIn.value = T.tin === 'USDG' ? '10000' : '2.5';
  render();
  announce('Demo balances loaded: 25,000 USDG and 8 WETH. Simulated.');
}

async function submit(opts = {}) {
  if (T.busy) return;
  if (!T.started) { startDemo(); return; }
  const v = validate();
  if (!v.ok) { amountIn.focus(); if (!v.msg) { $('#fieldIn').classList.add('bad'); setTimeout(() => $('#fieldIn').classList.remove('bad'), 900); } return; }
  const q = quote();
  const order = { mode: T.mode, tin: T.tin, tout: T.tout, amt: q.a, est: q.out, min: q.out * (1 - T.slip / 100), slip: T.slip, side: T.tin === 'USDG' ? 'buy' : 'sell' };
  T.last = order; T.snap = { ...T.bal }; T.busy = true;
  closePop(false);
  $('#resultWrap').classList.remove('open');
  cta.setAttribute('aria-disabled', 'true');
  pressFx();
  T.bal[T.tin] -= order.amt; render();
  buildTrack(order.mode); $('#trackWrap').classList.add('open');
  const rr = $('.rail').getBoundingClientRect();
  if (!RM && innerWidth < 1240 && rr.top < 70) { scrollBy({ top: rr.top - 78, behavior: 'smooth' }); await sleep(420); }
  try { if (order.mode === 'public') await runPublic(order); else await runDark(order); }
  finally { T.busy = false; render(); }
}
cta.addEventListener('click', () => submit());

function pressFx() {
  cta.classList.add('press'); setTimeout(() => cta.classList.remove('press'), 170);
  cta.classList.remove('sweep'); void cta.offsetWidth; cta.classList.add('sweep');
  setTimeout(() => cta.classList.remove('sweep'), 800);
  if (RM) return;
  const lift = $('#lift'), x = cta.offsetLeft + cta.offsetWidth / 2, y = cta.offsetTop + 4;
  lift.style.left = x + 'px'; lift.style.top = y + 'px';
  lift.animate([
    { opacity: 0, transform: 'translateY(6px) scale(.8)' },
    { opacity: 1, transform: 'translateY(-26px) scale(1)', offset: .4 },
    { opacity: 0, transform: 'translateY(-64px) scale(.85)' }
  ], { duration: 820, easing: 'cubic-bezier(.2,.7,.2,1)' });
}

async function runPublic(o) {
  setStep(0, 'public');
  await sleep(RM ? 300 : 220);
  setStep(1, 'public');
  const g = geo();
  await risePublic(g);
  const out = cpmm(o.amt, o.tin, o.tout);
  T.bal[o.tout] += out;
  setStep(2, 'public'); render();
  const px = o.tin === 'USDG' ? o.amt / out : out / o.amt;
  showResult(`<div class="r-head">${icon('lattice')}<span>Executed as a public swap</span><span class="sim">Simulated</span></div>
    <dl class="r-grid"><dt>You paid</dt><dd>${ta(o.amt, o.tin)}</dd><dt>You received</dt><dd>${ta(out, o.tout)}</dd><dt>Pool price</dt><dd>${fmt(px, 2)} USDG</dd><dt>Price impact</dt><dd>${pct(1 - out / (o.tin === 'USDG' ? o.amt / MID : o.amt * MID), 2)}</dd></dl>
    <p class="r-obs">EclipseHook saw no Eclipse data and passed the swap through. Anyone can see your wallet, size, direction and timing on-chain.</p>
    <div class="r-foot"><button class="btn btn-sm btn-ghost" data-action="replay">${icon('replay')}Replay demo</button><button class="btn btn-sm btn-ghost" data-action="try-dark">Try it in Dark mode</button></div>`, 'pub');
  announce(`Executed. Received ${ta(out, o.tout)}. Simulated.`);
}

async function runDark(o) {
  setStep(0, 'dark');
  await whenOpen();
  const w = W.cur; w.claimed = true; w.user = o;
  w.ff = { t0: now(), from: remaining({ ...w, ff: null, state: 'OPEN' }), dur: 1300 };
  waveChanged();
  const ap = $('#aperture'); ap.classList.add('active');
  const g = geo();
  const sides = [o.side, 'buy', 'sell', 'buy', 'sell', 'buy', 'sell'];
  const launch = riseLaunch(g, sides);
  await sleep(RM ? 500 : 1300);
  w.state = 'LOCKED'; w.ff = null; ap.classList.add('locked'); setStep(1, 'dark'); waveChanged();
  const dots = await launch;
  w.state = 'MATCHING'; setStep(2, 'dark'); waveChanged();
  await riseMatch(g, dots);
  const res = settleWithUser(w, o);
  w.state = 'EXECUTING'; setStep(3, 'dark'); waveChanged();
  await riseExecute(g);
  await risePulse(g);
  w.res = res; w.state = 'SETTLED'; w.ff = null;
  ap.classList.remove('active', 'locked');
  if (res.user.filled) T.bal[o.tout] += res.user.out; else T.bal[o.tin] += o.amt;
  setStep(4, 'dark');
  finishWave(w);
  render();
  const u = res.user;
  if (u.filled) {
    showResult(`<div class="r-head">${icon('settle', 'is-on')}<span>Settled in Eclipse Wave #${w.id}</span><span class="sim">Simulated</span></div>
      <dl class="r-grid"><dt>You paid</dt><dd>${ta(o.amt, o.tin)}</dd><dt>You received</dt><dd>${ta(u.out, o.tout)}</dd><dt>Clearing price</dt><dd>${fmt(u.px, 2)} USDG</dd><dt>Your minimum</dt><dd>${ta(o.min, o.tout)}</dd><dt>Wave matched internally</dt><dd>${pct(res.eff)}</dd></dl>
      <p class="r-obs">On-chain, the whole wave shows up as one combined trade. Your deposit and payout stay visible until funding is shielded.</p>
      <div class="r-foot"><button class="btn btn-sm btn-ghost" data-action="replay">${icon('replay')}Replay demo</button><button class="btn btn-sm btn-ghost" data-action="details" data-id="${w.id}">Wave receipt</button><button class="btn-link" data-action="new-order">New order</button></div>`);
    announce(`Settled in Eclipse Wave ${w.id}. Received ${ta(u.out, o.tout)}. Simulated.`);
  } else {
    showResult(`<div class="r-head">${icon('warn')}<span>Not filled · minimum not met</span><span class="sim">Simulated</span></div>
      <dl class="r-grid"><dt>Wave would clear you at</dt><dd>${ta(u.wouldGet, o.tout)}</dd><dt>Your minimum</dt><dd>${ta(o.min, o.tout)}</dd><dt>Returned</dt><dd>${ta(o.amt, o.tin)}</dd></dl>
      <p class="r-obs">Slippage protection held. Your order was removed, the wave re-netted without it, and the rest executed.</p>
      <div class="r-foot"><button class="btn btn-sm btn-ghost" data-action="replay">${icon('replay')}Replay demo</button><button class="btn btn-sm btn-ghost" data-action="details" data-id="${w.id}">Wave receipt</button></div>`, 'fail');
    announce('Not filled. Minimum not met. Demo balance returned.');
  }
}
function settleWithUser(w, o) {
  const all = [...w.orders, { side: o.side, amt: o.amt }];
  let res = settle(all);
  const fill = res.fills[all.length - 1];
  if (fill + 1e-12 < o.min) { res = settle(w.orders); res.user = { filled: false, wouldGet: fill }; }
  else res.user = { filled: true, out: fill, px: o.side === 'buy' ? o.amt / fill : fill / o.amt };
  return res;
}

/* ---------- rise swap layer ---------- */
const hero = $('#top'), riseSvg = $('#rise'), riseG = $('#riseG');
function mk(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || riseG).appendChild(e); return e; }
function geo() {
  const h = hero.getBoundingClientRect();
  const R = el => { const r = el.getBoundingClientRect(); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, cx: r.left - h.left + r.width / 2, cy: r.top - h.top + r.height / 2 }; };
  const g = { W: h.width, H: h.height, term: R(term), btn: R(cta), ap: R($('#aperture')), ep: R($('#endpoint')) };
  g.vertical = g.ap.x > g.term.x + g.term.w - 2;
  g.rc = g.ap.w * 0.32;
  g.A = { x: g.ap.cx, y: g.ap.cy }; g.E = { x: g.ep.cx, y: g.ep.cy };
  const gr = R($('#hookGate')); g.G = { x: gr.cx, y: gr.cy };
  riseSvg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
  return g;
}
const P = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
function curve(o, a, bend) {
  const dx = a.x - o.x, dy = a.y - o.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const c1 = { x: o.x + dx * .3 + nx * bend, y: o.y + dy * .3 + ny * bend }, c2 = { x: o.x + dx * .74 + nx * bend * .3, y: o.y + dy * .74 + ny * bend * .3 };
  return `M${P(o)} C${P(c1)} ${P(c2)} ${P(a)}`;
}
function clearRise() { riseG.innerHTML = ''; riseG.style.opacity = 1; }
const COL = { buy: '#9B8CFF', sell: '#CBD0E2' };
function fragment(color, bright) {
  const g = mk('g', { opacity: 0 });
  mk('circle', { r: bright ? 16 : 11, fill: 'url(#gGlow)', opacity: bright ? 1 : .6 }, g);
  mk('rect', { x: -4.5, y: -5.5, width: 9, height: 11, rx: 1.6, fill: '#0B0C12', stroke: bright ? '#E4DEFF' : color, 'stroke-width': 1.1 }, g);
  mk('path', { d: 'M-2 -1.2h4M-2 1.8h2.4', stroke: bright ? '#E4DEFF' : color, 'stroke-width': 1, 'stroke-linecap': 'round', fill: 'none', opacity: .85 }, g);
  return g;
}
function travel(pathEl, frag, ms, delay, e = E_.io) {
  const len = pathEl.getTotalLength();
  pathEl.style.strokeDasharray = `${len} ${len}`; pathEl.style.strokeDashoffset = len;
  return sleep(delay).then(() => tween(ms, p => {
    const pt = pathEl.getPointAtLength(len * p);
    pathEl.style.strokeDashoffset = len * (1 - p);
    if (frag) { frag.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) scale(${(1 - .35 * p).toFixed(3)})`); frag.setAttribute('opacity', Math.min(1, p * 6)); }
  }, e));
}
async function riseLaunch(g, sides) {
  clearRise();
  const n = sides.length, A = g.A;
  const slots = sides.map((s, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return { x: A.x + Math.cos(a) * g.rc * .55, y: A.y + Math.sin(a) * g.rc * .55 }; });
  if (RM) { return sides.map((s, i) => ({ side: s, el: mk('circle', { cx: slots[i].x, cy: slots[i].y, r: 3, fill: COL[s] }), x: slots[i].x, y: slots[i].y })); }
  const jobs = [], trails = [];
  // user's order: emerges from the terminal and rises into the aperture
  const S = g.vertical ? { x: g.term.x + g.term.w - 2, y: g.btn.cy } : { x: g.btn.cx, y: g.term.y + 2 };
  const u = slots[0];
  const ud = g.vertical
    ? `M${P(S)} C${S.x + 90} ${S.y} ${u.x - 20} ${lerp(S.y, u.y, .55)} ${P(u)}`
    : `M${P(S)} C${S.x} ${S.y - 50} ${lerp(u.x, S.x, .25)} ${u.y + 80} ${P(u)}`;
  const up = mk('path', { d: ud, fill: 'none', stroke: '#D5CDFF', 'stroke-opacity': .55, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
  const uf = fragment(COL[sides[0]], true); trails.push(up);
  jobs.push(travel(up, uf, 1350, 140));
  // other private orders: separate paths from the edges of the scene
  const angs = g.vertical ? [-168, -122, -80, -38, 6, 48] : [180, -148, -110, -66, -26, 152];
  const R = g.vertical ? 340 : 300;
  for (let i = 1; i < n; i++) {
    const a = angs[(i - 1) % angs.length] * Math.PI / 180;
    const O = { x: A.x + Math.cos(a) * R, y: A.y + Math.sin(a) * R };
    const p = mk('path', { d: curve(O, slots[i], (i % 2 ? 1 : -1) * (50 + i * 6)), fill: 'none', stroke: COL[sides[i]], 'stroke-opacity': .3, 'stroke-width': 1, 'stroke-linecap': 'round' });
    trails.push(p);
    jobs.push(travel(p, fragment(COL[sides[i]], false), 1150, 320 + i * 120));
  }
  await Promise.all(jobs);
  // fragments condense into dots inside the aperture
  const dots = sides.map((s, i) => ({ side: s, x: slots[i].x, y: slots[i].y, el: mk('circle', { cx: slots[i].x, cy: slots[i].y, r: 0, fill: COL[s] }) }));
  const frags = $$('g', riseG).filter(x => x.parentNode === riseG);
  await tween(320, p => {
    dots.forEach(d => d.el.setAttribute('r', (3.2 * p).toFixed(2)));
    frags.forEach(f => f.setAttribute('opacity', 1 - p));
    trails.forEach(t => t.setAttribute('opacity', 1 - p * .85));
  }, E_.out);
  frags.forEach(f => f.remove());
  tween(500, p => trails.forEach(t => t.setAttribute('opacity', .15 * (1 - p)))).then(() => trails.forEach(t => t.remove()));
  return dots;
}
async function riseMatch(g, dots) {
  if (RM) { await sleep(600); return; }
  const buys = dots.filter(d => d.side === 'buy'), sells = dots.filter(d => d.side === 'sell');
  const k = Math.min(buys.length, sells.length), pairs = [];
  for (let i = 0; i < k; i++) pairs.push([buys[i], sells[i]]);
  const rest = [...buys.slice(k), ...sells.slice(k)];
  await Promise.all(pairs.map(([a, b], i) => sleep(i * 210).then(async () => {
    const ln = mk('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#D5CDFF', 'stroke-opacity': 0, 'stroke-width': 1 });
    await tween(240, p => ln.setAttribute('stroke-opacity', .55 * p));
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, a0 = { ...a }, b0 = { ...b };
    await tween(560, p => {
      const ax = lerp(a0.x, m.x, p), ay = lerp(a0.y, m.y, p), bx = lerp(b0.x, m.x, p), by = lerp(b0.y, m.y, p);
      a.el.setAttribute('cx', ax); a.el.setAttribute('cy', ay); b.el.setAttribute('cx', bx); b.el.setAttribute('cy', by);
      ln.setAttribute('x1', ax); ln.setAttribute('y1', ay); ln.setAttribute('x2', bx); ln.setAttribute('y2', by);
    });
    b.el.remove(); ln.remove();
    await tween(320, p => { a.el.setAttribute('opacity', 1 - .8 * p); a.el.setAttribute('r', 3.2 - 1.2 * p); a.el.setAttribute('fill', '#7C8297'); });
  })));
  const c = g.A;
  const glow = mk('circle', { cx: c.x, cy: c.y, r: 0, fill: 'url(#gGlow)' });
  const r0 = rest.map(d => ({ x: +d.el.getAttribute('cx'), y: +d.el.getAttribute('cy') }));
  await tween(480, p => {
    rest.forEach((d, i) => { d.el.setAttribute('cx', lerp(r0[i].x, c.x, p)); d.el.setAttribute('cy', lerp(r0[i].y, c.y, p)); d.el.setAttribute('fill', '#E4DEFF'); d.el.setAttribute('r', 3.2 + 1.6 * p); });
    glow.setAttribute('r', 22 * p);
  });
  g.netDot = rest[0] && rest[0].el; g.netGlow = glow;
  rest.slice(1).forEach(d => d.el.remove());
}
async function ribbon(g, d, light, ms, endFlash = true) {
  const wide = mk('path', { d, fill: 'none', stroke: light ? '#F3F4F8' : '#9B8CFF', 'stroke-opacity': light ? .1 : .16, 'stroke-width': 7, 'stroke-linecap': 'round' });
  const core = mk('path', { d, fill: 'none', stroke: light ? '#F3F4F8' : '#D5CDFF', 'stroke-opacity': .9, 'stroke-width': 1.6, 'stroke-linecap': 'round' });
  const glow = mk('circle', { r: 18, fill: light ? 'url(#gGlowWhite)' : 'url(#gGlow)' }), head = mk('circle', { r: 3.4, fill: '#fff' });
  const len = core.getTotalLength();
  [wide, core].forEach(p => { p.style.strokeDasharray = `${len} ${len}`; p.style.strokeDashoffset = len; });
  await tween(ms, p => {
    const pt = core.getPointAtLength(len * p);
    [wide, core].forEach(x => { x.style.strokeDashoffset = len * (1 - p); });
    head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y); glow.setAttribute('cx', pt.x); glow.setAttribute('cy', pt.y);
    if (g.netDot) { g.netDot.setAttribute('opacity', 1 - p); g.netGlow.setAttribute('opacity', 1 - p); }
  });
  if (endFlash) flashEndpoint();
  tween(500, p => { head.setAttribute('opacity', 1 - p); glow.setAttribute('opacity', 1 - p); wide.setAttribute('opacity', 1 - p * .6); });
}
function seg(a, b, vertical, k = 26) {
  return vertical
    ? `M${P(a)} C${a.x + k} ${lerp(a.y, b.y, .4)} ${b.x - k} ${lerp(a.y, b.y, .6)} ${P(b)}`
    : `M${P(a)} C${lerp(a.x, b.x, .4)} ${a.y - k} ${lerp(a.x, b.x, .6)} ${b.y + k} ${P(b)}`;
}
const gate = $('#hookGate'), gateL = $('#gateL');
function gateState(s, label) { gate.className = 'gate' + (s ? ' ' + s : ''); gateL.textContent = label || 'EclipseHook'; }
async function riseExecute(g) {
  if (RM) { gateState('pass', 'beforeSwap ✓'); flashEndpoint(); await sleep(700); gateState(''); return; }
  await ribbon(g, seg(g.A, g.G, g.vertical), false, 560, false);
  gateState('check', 'beforeSwap…'); announce('EclipseHook verifying the wave');
  await sleep(520);
  gateState('pass', 'beforeSwap ✓');
  await ribbon(g, seg(g.G, g.E, g.vertical), false, 520);
  gateState('pass', 'afterSwap ✓');
  setTimeout(() => gateState(''), 1600);
}
async function risePulse(g) {
  if (RM) { term.classList.add('pulse'); setTimeout(() => term.classList.remove('pulse'), 1100); await sleep(300); return; }
  const E = g.E;
  const Tg = g.vertical ? { x: g.term.x + g.term.w - 2, y: g.btn.cy - 30 } : { x: g.term.x + g.term.w * .8, y: g.term.y + 2 };
  const p = mk('path', { d: curve(E, Tg, g.vertical ? 46 : -40), fill: 'none', stroke: '#83E8C0', 'stroke-opacity': .5, 'stroke-width': 1.1, 'stroke-linecap': 'round' });
  const glow = mk('g', {}); mk('circle', { r: 16, fill: 'url(#gGlowMint)' }, glow); mk('circle', { r: 3.2, fill: '#C9F7E4' }, glow);
  await travel(p, glow, 620, 0, E_.in);
  term.classList.remove('pulse'); void term.offsetWidth; term.classList.add('pulse');
  setTimeout(() => term.classList.remove('pulse'), 1150);
  await tween(380, q => { riseG.style.opacity = 1 - q; });
  clearRise();
}
async function risePublic(g) {
  if (RM) { gateState('public', 'pass-through'); flashEndpoint(); await sleep(500); gateState(''); return; }
  clearRise();
  const S = g.vertical ? { x: g.term.x + g.term.w - 2, y: g.btn.cy } : { x: g.btn.cx, y: g.term.y + 2 }, E = g.E;
  const d = g.vertical
    ? `M${P(S)} C${S.x + 70} ${S.y} ${g.G.x - 70} ${g.G.y} ${P(g.G)}`
    : `M${P(S)} C${S.x} ${S.y - 70} ${g.G.x} ${g.G.y + 70} ${P(g.G)}`;
  await ribbon(g, d, true, 560, false);
  gateState('public', 'pass-through');
  await ribbon(g, seg(g.G, E, g.vertical), true, 380);
  setTimeout(() => gateState(''), 1400);
  await sleep(160);
  term.classList.remove('pulse'); void term.offsetWidth; term.classList.add('pulse');
  setTimeout(() => term.classList.remove('pulse'), 1150);
  await tween(380, q => { riseG.style.opacity = 1 - q; });
  clearRise();
}

/* ---------- ambient scene ---------- */
const scene = $('#scene'); let drift = [], sceneVisible = true;
function buildScene() {
  const h = hero.getBoundingClientRect(), ap = $('#aperture').getBoundingClientRect();
  if (!h.width) return;
  const A = { x: ap.left - h.left + ap.width / 2, y: ap.top - h.top + ap.height / 2 }, rc = ap.width * .32;
  hero.style.setProperty('--ax', A.x + 'px'); hero.style.setProperty('--ay', A.y + 'px');
  scene.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
  scene.innerHTML = ''; drift = [];
  const small = innerWidth < 920, count = small ? 6 : 12, R = Math.max(h.width, h.height) * .95, r = rng(41);
  [ap.width * .9, ap.width * 1.6, ap.width * 2.5].forEach((rad, i) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', A.x); c.setAttribute('cy', A.y); c.setAttribute('r', rad); c.setAttribute('class', 'scene-ring' + (i === 1 ? ' d' : ''));
    scene.appendChild(c);
  });
  const tr = term.getBoundingClientRect();
  if (ap.left > tr.right - 2) {
    const s = { x: tr.right - h.left, y: tr.top - h.top + tr.height * .62 };
    const c = document.createElementNS(NS, 'path');
    c.setAttribute('d', `M${P(s)} C${s.x + 40} ${s.y} ${A.x - 30} ${A.y + rc * 3} ${A.x - rc * .7} ${A.y + rc * .75}`);
    c.setAttribute('class', 'scene-link'); scene.appendChild(c);
  }
  for (let i = 0; i < count; i++) {
    const a = -Math.PI + (i + .5) * (2 * Math.PI / count) + (r() - .5) * .3;
    const O = { x: A.x + Math.cos(a) * R, y: A.y + Math.sin(a) * R }, end = { x: A.x + Math.cos(a) * rc * 1.05, y: A.y + Math.sin(a) * rc * 1.05 };
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', curve(O, end, (i % 2 ? 1 : -1) * (60 + r() * 90))); p.setAttribute('class', 'scene-path');
    scene.appendChild(p);
    if (!small && i % 2 === 0) {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = '<rect x="-4" y="-5" width="8" height="10" rx="1.5" fill="#0B0C12" stroke="#A3A9BB" stroke-width="1"/><path d="M-1.8 -1h3.6M-1.8 1.6h2" stroke="#A3A9BB" stroke-width=".9" stroke-linecap="round"/>';
      g.setAttribute('opacity', 0); scene.appendChild(g);
      drift.push({ p, g, len: p.getTotalLength(), period: 34000 + r() * 26000, off: r() });
    }
  }
  if (RM) drift.forEach(d => { const pt = d.p.getPointAtLength(d.len * (.35 + d.off * .4)); d.g.setAttribute('transform', `translate(${pt.x} ${pt.y})`); d.g.setAttribute('opacity', .25); });
}
function driftLoop(t) {
  if (!RM && sceneVisible) drift.forEach(d => {
    const p = ((t / d.period) + d.off) % 1, pt = d.p.getPointAtLength(d.len * p);
    d.g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) scale(${(1 - p * .4).toFixed(3)})`);
    d.g.setAttribute('opacity', (Math.sin(Math.PI * p) * .42).toFixed(3));
  });
  requestAnimationFrame(driftLoop);
}
new IntersectionObserver(es => { sceneVisible = es[0].isIntersecting; }).observe(hero);

/* ---------- countdown frame ---------- */
const ringProg = $('#ringProg'), apCount = $('#apCount');
let lastSec = -1, lastState = '';
function frame() {
  const w = W.cur, open = w.state === 'OPEN', rem = remaining(w);
  const frac = open ? rem / WAVE_MS : 1;
  const off = (100 - frac * 100).toFixed(2);
  ringProg.style.strokeDashoffset = off; apCount.style.strokeDashoffset = off;
  const sec = Math.ceil(rem / 1000), key = w.id + w.state + (w.claimed ? 'c' : '');
  if (sec !== lastSec || key !== lastState) {
    lastSec = sec; lastState = key;
    const st = { OPEN: 'Open', LOCKED: 'Locked', MATCHING: 'Matching', EXECUTING: 'Executing', SETTLED: 'Settled' }[w.state];
    if (open) $('#ringNum').textContent = String(sec).padStart(2, '0'); else $('#ringNum').innerHTML = icon('wave', 'is-on');
    ($('#hsWave') || {}).textContent = open ? `#${w.id} · Open ${mmss(rem)}` : `#${w.id} · ${st}`;
    $('#waveBox').classList.toggle('locked', !open);
    if (T.busy && w.user && T.mode === 'dark') { $('#waveTitle').textContent = `Your order · Wave #${w.id}`; $('#waveSub').textContent = open ? 'Fast-forward · demo' : st + ' · accelerated'; }
    else if (open) { $('#waveTitle').textContent = `Next Eclipse Wave #${w.id}`; $('#waveSub').textContent = `Closes in ${mmss(rem)}`; }
    else { $('#waveTitle').textContent = `Eclipse Wave #${w.id} · ${st.toLowerCase()}`; $('#waveSub').textContent = `Wave #${w.id + 1} opens next`; }
    $('#railWave').textContent = `Eclipse Wave #${w.id}`;
    $('#railState').textContent = open ? `${st} · ${mmss(rem)}` : st;
    const cd = $('#wRows [data-cd]'); if (cd) cd.textContent = mmss(rem);
    if (!T.busy && T.mode === 'dark') $('#execLine').textContent = `Eclipse Wave #${w.id}`;
  }
  requestAnimationFrame(frame);
}

/* ---------- activity table ---------- */
const ST = { OPEN: 'Open', LOCKED: 'Locked', MATCHING: 'Matching', EXECUTING: 'Executing', SETTLED: 'Settled' };
const MASK = '<span class="mask" aria-hidden="true"><i></i><i></i><i></i></span>';
function netCell(res) {
  const n = res.net;
  if (n.amtIn < 1e-9) return 'Fully matched';
  return `${ta(n.amtIn, n.tin)} → ${n.tout}<span class="net-dir">net ${n.side}</span>`;
}
let lastNewId = null;
function renderTable() {
  const rows = [W.cur, ...W.hist].slice(0, 8);
  $('#wRows').innerHTML = rows.map(w => {
    const s = w.state === 'SETTLED', you = w.user && T.last && (s || w === W.cur);
    return `<tr class="${w.id === lastNewId ? 'new' : ''}">
      <td class="w">#${w.id}${you ? '<span class="you">You</span>' : ''}</td>
      <td>${w.market}</td>
      <td>${s ? w.res.n : MASK + '<span class="sr">Hidden</span>'}</td>
      <td><span class="pill s-${w.state.toLowerCase()}"><i></i>${ST[w.state]}${w.state === 'OPEN' ? ` <span class="cd" data-cd>${mmss(remaining(w))}</span>` : ''}</span></td>
      <td>${s ? netCell(w.res) : MASK + '<span class="mask-l">Hidden until it trades</span>'}</td>
      <td class="c-nt">${s ? `<span class="nbar"><i style="width:${(w.res.eff * 100).toFixed(1)}%"></i></span>${pct(w.res.eff)}` : '<span class="mask-l">–</span>'}</td>
      <td><button class="dbtn" data-action="details" data-id="${w.id}" aria-label="Details for Eclipse Wave ${w.id}"><span class="t">Details</span>${icon('arrow')}</button></td></tr>`;
  }).join('');
  lastNewId = null;
  const set = W.hist.filter(w => w.res);
  const gross = set.reduce((a, w) => a + w.res.gross, 0), eff = set.length ? set.reduce((a, w) => a + w.res.eff, 0) / set.length : 0;
  const last = W.hist.find(w => w.res);
  if (last && $('#hsLast')) { $('#hsLast').textContent = `#${last.id} · ${pct(last.res.eff)} netted`; $('#hsHook').textContent = last.res.net.amtIn < 1e-9 ? 'No swap · fully matched' : '6/6 checks passed'; }
  if ($('#hsGross')) $('#hsGross').textContent = short(gross);
  $('#cStats').innerHTML = `<span>Settled<b>${set.length}</b></span><span>Gross private<b>${short(gross)}</b></span><span>Avg netting<b>${pct(eff)}</b></span>`;
}
function waveChanged(settledId) {
  if (settledId) lastNewId = settledId;
  renderTable(); renderMetrics();
  if (drawerId != null) { const w = findWave(drawerId); if (w) $('#dwBody').innerHTML = drawerHTML(w); }
}
const findWave = id => (W.cur.id === id ? W.cur : W.hist.find(w => w.id === id));

/* ---------- drawer ---------- */
const drawer = $('#drawer'), scrim = $('#scrim'); let drawerId = null, drawerReturn = null;
const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour12: false });
function drawerHTML(w) {
  const s = w.res, order = ['OPEN', 'LOCKED', 'MATCHING', 'EXECUTING', 'SETTLED'], idx = order.indexOf(w.state);
  $('#dwTitle').textContent = `Eclipse Wave #${w.id}`;
  const life = `<div class="life">${order.map((x, i) => `<div class="step${i < idx ? ' done' : ''}${i === idx ? ' on' : ''}${i === 4 ? ' final' : ''}"><i></i><span>${ST[x]}</span></div>`).join('')}</div>`;
  let h = `<div class="dw-sec"><div class="dw-tags"><span class="pill s-${w.state.toLowerCase()}"><i></i>${ST[w.state]}</span><span class="sim">${w.market}</span><span class="sim">Simulated</span></div>
    <div style="margin-top:18px">${life}</div>
    <p class="muted" style="font-size:12.5px;margin-top:14px">Opened ${clock(w.opensAt)} · 30 s demo window · settlement accelerated</p></div>`;
  if (!s) {
    return h + `<div class="dw-sec"><div class="hidden-box">${MASK}<p><b style="color:var(--text);font-weight:500">Buy or sell, and how much, stay hidden.</b><br>They are published only after the wave executes, so nobody can trade ahead of it.</p></div></div>`;
  }
  const n = s.net, u = w.user, ur = s.user;
  if (u) {
    h += `<div class="dw-sec"><h3>Your demo order</h3><div class="you-box">${ur.filled
      ? `Paid <b>${ta(u.amt, u.tin)}</b> · received <b>${ta(ur.out, u.tout)}</b> at <b>${fmt(ur.px, 2)}</b> USDG per WETH. Minimum was ${ta(u.min, u.tout)}.`
      : `Not filled. The wave would have cleared you at <b>${ta(ur.wouldGet, u.tout)}</b>, below your minimum of <b>${ta(u.min, u.tout)}</b>. ${ta(u.amt, u.tin)} returned.`}</div></div>`;
  }
  h += `<div class="dw-sec"><h3>Aggregate</h3><dl class="kv">
    <div><dt>Participants</dt><dd>${s.n}</dd></div>
    <div><dt>Gross private volume</dt><dd>$${fmt(s.gross, 0)}<small>both sides, at mid</small></dd></div>
    <div><dt>Internal match</dt><dd>$${fmt(s.matched, 0)}<small>each side, never touched the pool</small></dd></div>
    <div><dt>Leftover sent to pool</dt><dd>${n.amtIn < 1e-9 ? 'None' : '$' + fmt(n.usd, 0)}<small>${n.amtIn < 1e-9 ? 'fully matched' : `net ${n.side} · ${n.tin} → ${n.tout}`}</small></dd></div>
    </dl>
    <div class="eff"><div class="eff-top"><span>Netting efficiency</span><b>${pct(s.eff)}</b></div>
    <div class="eff-bar"><i style="width:${(s.eff * 100).toFixed(2)}%"></i><i style="width:${((1 - s.eff) * 100).toFixed(2)}%"></i></div>
    <div class="eff-leg"><span>Matched internally</span><span>Routed to pool</span></div></div></div>`;
  const diff = s.B - s.SV;
  h += `<div class="dw-sec"><h3>Reconciliation</h3><div class="recon">
    <div class="r"><span>Buy side</span><b>${fmt(s.B, 2)} USDG</b></div>
    <div class="r"><span>Sell side</span><b>${fmt(s.S, 4)} WETH ≈ ${fmt(s.SV, 2)} USDG</b></div>
    <div class="r"><span>Matched</span><b>${fmt(s.matched, 2)} ↔ ${fmt(s.matched, 2)}</b></div>
    <div class="r"><span>Net to pool</span><b>${n.amtIn < 1e-9 ? '0.00' : ta(n.amtIn, n.tin) + ' → ' + ta(n.amtOut, n.tout)}</b></div><hr>
    <div class="r"><span>BUY − SELL</span><b>${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), 2)} USDG</b></div>
    <div class="r"><span>NET (signed, at mid)</span><b>${diff >= 0 ? '+' : '−'}${fmt(n.usd, 2)} USDG</b></div>
    <div class="r"><span>Invariant</span><b class="ok">Reconciled ✓</b></div><hr>
    <div class="r"><span>Buy-side clearing</span><b>${fmt(s.buyPx, 2)}</b></div>
    <div class="r"><span>Sell-side clearing</span><b>${fmt(s.sellPx, 2)}</b></div>
    <div class="r"><span>Eclipse fee · 5 bps</span><b>$${fmt(s.feeUsd, 2)}</b></div>
    <div class="r"><span>Pool fee · net only</span><b>$${fmt(s.poolFeeUsd, 2)}</b></div>
    </div><p class="muted" style="font-size:12px;margin-top:10px">Illustrative clearing model: matched volume at simulated mid ${fmt(MID, 2)}; the net remainder takes the pool price and its impact is shared pro-rata by the net side.</p></div>`;
  h += `<div class="dw-sec"><h3>EclipseHook</h3>${n.amtIn < 1e-9
      ? '<div class="proof-row"><span>Pool swap</span><b>None needed · fully matched</b></div>'
      : `<div class="proof-row"><span>beforeSwap</span><b class="okc">6/6 checks passed · simulated</b></div>
    <div class="proof-row"><span>afterSwap</span><b>Delta recorded · wave marked executed</b></div>
    <div class="proof-row"><span>Fee via return delta</span><b>$${fmt(s.feeUsd, 2)} · 5 bps</b></div>`}
    <div class="proof-row"><span>Route</span><b>Eclipse Executor → PoolManager → hook</b></div></div>`;
  h += `<div class="dw-sec"><h3>Proof data</h3>
    <div class="proof-row"><span>Validity proof</span><b class="warn">Not verified · simulated placeholder</b></div>
    <div class="proof-row"><span>Settlement root</span><b>${hex(w.id)}</b></div>
    <div class="proof-row"><span>Execution tx</span><b>None · no on-chain transaction</b></div>
    <div class="proof-row"><span>Pool</span><b>WETH / USDG · simulated snapshot</b></div></div>`;
  return h;
}
function openDrawer(id, trigger) {
  const w = findWave(id); if (!w) return;
  drawerId = id; drawerReturn = trigger || document.activeElement;
  $('#dwBody').innerHTML = drawerHTML(w); $('#dwBody').scrollTop = 0;
  drawer.hidden = false; scrim.hidden = false; void drawer.offsetWidth;
  drawer.classList.add('open'); scrim.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#dwClose').focus(), RM ? 0 : 60);
}
function closeDrawer() {
  if (drawerId == null) return;
  drawerId = null; drawer.classList.remove('open'); scrim.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { if (drawerId == null) { drawer.hidden = true; scrim.hidden = true; } }, RM ? 0 : 460);
  if (drawerReturn && document.contains(drawerReturn)) drawerReturn.focus();
  else { const b = $(`#wRows [data-id]`); b && b.focus(); }
}
$('#dwClose').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (drawerId == null) return;
  if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
  if (e.key === 'Tab') {
    const f = $$('button, [href], [tabindex]:not([tabindex="-1"])', drawer).filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- actions ---------- */
function openApp(focusCta) {
  if (!$('#docsView').hidden) { history.pushState(null, '', '#top'); showLanding(); }
  term.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
  term.classList.remove('attn'); void term.offsetWidth; term.classList.add('attn');
  setTimeout(() => term.classList.remove('attn'), 1300);
  setTimeout(() => { (focusCta || !T.started ? cta : amountIn).focus({ preventScroll: true }); }, RM ? 0 : 450);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action;
  if (a === 'open-app') { closeMenu(); window.location.href = '/markets'; }
  else if (a === 'try-wave') {
    setMode('dark');
    if (!T.started) startDemo();
    if (!T.busy && validate().ok === false && T.started && !amountIn.value) { amountIn.value = T.tin === 'USDG' ? '10000' : '2.5'; render(); }
    openApp(true);
  }
  else if (a === 'try-dark') { setMode('dark'); openApp(true); }
  else if (a === 'hk-try') { selectScenario(b.dataset.sc); hkRun(); }
  else if (a === 'details') openDrawer(+b.dataset.id, b);
  else if (a === 'new-order') { hideResult(); amountIn.value = ''; render(); amountIn.focus(); }
  else if (a === 'replay') {
    if (T.busy || !T.last) return;
    const o = T.last;
    T.bal = { ...T.snap };
    if (T.mode !== o.mode) setMode(o.mode);
    T.tin = o.tin; T.tout = o.tout; amountIn.value = String(o.amt);
    setSlip(o.slip, ![0.1, 0.5, 1].includes(o.slip));
    if (![0.1, 0.5, 1].includes(o.slip)) slipCustom.value = String(o.slip);
    render(); cta.focus({ preventScroll: true }); submit();
  }
});

/* ---------- nav ---------- */
const nav = $('#nav'), menuBtn = $('#menuBtn'), links = $('#navLinks');
function closeMenu() { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
menuBtn.addEventListener('click', () => { const o = !links.classList.contains('open'); links.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', o); menuBtn.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); });
links.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });

/* ---------- flow (scroll-linked) ---------- */
const fActive = $('#fActive'), fHead = $('#fHead');
let fLen = 0, fr = [0, .33, .66, 1];
const brs = $$('#fBr path'), prs = $$('#fPr path'), nets = $$('#fNet path');
function initFlow() {
  fLen = fActive.getTotalLength();
  fActive.style.strokeDasharray = `${fLen} ${fLen}`;
  const at = x => { let lo = 0, hi = fLen; for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (fActive.getPointAtLength(m).x < x) lo = m; else hi = m; } return lo / fLen; };
  fr = [150, 450, 750, 1050].map(at);
  [...brs, ...prs, ...nets].forEach(p => { const l = p.getTotalLength(); p._l = l; p.style.strokeDasharray = `${l} ${l}`; p.style.strokeDashoffset = l; });
}
function dash(list, t) { list.forEach(p => { p.style.strokeDashoffset = p._l * (1 - clamp(t, 0, 1)); }); }
function updateFlow() {
  const box = $('#flowStage').getBoundingClientRect(), vh = innerHeight;
  let Pg = clamp((vh * .8 - box.top) / (box.height + vh * .25), 0, 1);
  if (RM) Pg = 1;
  const p = clamp(Pg / .82, 0, 1);
  fActive.style.strokeDashoffset = fLen * (1 - p);
  const pt = fActive.getPointAtLength(fLen * p);
  fHead.setAttribute('cx', pt.x); fHead.setAttribute('cy', pt.y); fHead.style.opacity = p > .002 && p < .999 ? 1 : 0;
  $$('.fnode').forEach((n, i) => n.classList.toggle('on', p >= fr[i] - .005));
  $$('.fnode').forEach((n, i) => n.querySelector('.ic').classList.toggle('is-on', p >= fr[i] - .005));
  dash(brs, (p - (fr[1] - .2)) / .2);
  $('#fBr').classList.toggle('joined', p > fr[1] + .03);
  $$('#fBr rect').forEach(r => { r.style.opacity = p > fr[1] - .2 && p < fr[1] + .02 ? 1 : (p >= fr[1] + .02 ? 0 : .35); });
  dash(prs, (p - (fr[2] - .18)) / .18);
  $('#fPr').classList.toggle('matched', p > fr[2] + .02);
  const q = clamp((Pg - .82) / .14, 0, 1);
  dash(nets, q);
  $('#fEnd').classList.toggle('on', q >= .98);
  $$('.f-tag').forEach(t => { const i = +t.dataset.t; t.classList.toggle('on', p >= fr[i + 1] - .02 || (i === 2 && q > .1)); });
  $('#fEnd .ic').classList.toggle('is-on', q >= .98);
  $$('.fstep').forEach((s, i) => { const on = RM || (innerWidth > 860 ? p >= fr[i] - .005 || (i === 3 && q > .2) : s.getBoundingClientRect().top < vh * .72); s.classList.toggle('on', on); const fi = s.querySelector('.fi .ic'); fi && fi.classList.toggle('is-on', on); });
  $('#flowLine').style.transform = `scaleY(${Pg})`;
}

/* ---------- observer ---------- */
const OBS = [
  ['0x3f2a…91c4', 'buy', 4200.00, '12:00:03'], ['0x8be0…2d17', 'sell', 4000.00, '12:00:05'], ['0xa41c…77e0', 'buy', 10000.00, '12:00:08'],
  ['0x19d5…c3a8', 'sell', 7000.00, '12:00:11'], ['0xe702…5b9f', 'buy', 3000.00, '12:00:14'], ['0x5c6b…0e42', 'sell', 2500.00, '12:00:17'],
  ['0xd03f…a861', 'buy', 6500.00, '12:00:20'], ['0x7a18…f2d3', 'sell', 6000.00, '12:00:23'], ['0x2e94…8c05', 'buy', 1800.00, '12:00:26'],
  ['0xb6c1…4d7a', 'sell', 4000.00, '12:00:29']
];
$('#exRows').innerHTML = OBS.map(([w, s, usd, t], i) => `<li class="ex-row" style="--i:${i}"><span class="w">${w}</span><span class="${s === 'buy' ? 'b' : 's'}">${s === 'buy' ? 'USDG → WETH' : 'WETH → USDG'}</span><span>${s === 'buy' ? fmt(usd, 2) + ' USDG' : fmt(usd / MID, 4) + ' WETH'}</span><span>${t}</span></li>`).join('');
function setObs(view) {
  const dark = view === 'dark';
  $('#explorer').classList.toggle('dark', dark);
  const ey = $('#eyes'); if (ey) ey.classList.toggle('closed', dark);
  $('#obsSeg').classList.toggle('right', dark);
  $$('#obsSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
  $('#exFootL').textContent = dark ? 'Visible pool interactions' : 'Visible swaps';
  $('#exFootR').textContent = dark ? '1 combined' : '10 individual';
  if ($('#obsStats')) $('#obsStats').innerHTML = dark
    ? '<div><dt>Gross private volume</dt><dd>$49,000</dd></div><div><dt>Matched internally</dt><dd>$23,500 ↔ $23,500</dd></div><div><dt>Net to the pool</dt><dd>$2,000</dd></div><div><dt>Netting efficiency</dt><dd>95.9%</dd></div>'
    : '<div><dt>Wallets exposed</dt><dd>10</dd></div><div><dt>Sizes exposed</dt><dd>10</dd></div><div><dt>Directions exposed</dt><dd>10</dd></div><div><dt>Volume through the pool</dt><dd>$49,000</dd></div>';
}
$$('#obsSeg button').forEach(b => b.addEventListener('click', () => setObs(b.dataset.view)));
setObs('public');

/* ---------- phases ---------- */
function setPhase(ph) {
  $$('#phCtrl button').forEach(b => b.setAttribute('aria-pressed', b.dataset.ph === ph));
  $$('#ph [data-col]').forEach(c => c.classList.toggle('sel', c.dataset.col === ph));
  $$('#phasePath .plat').forEach(g => { const on = g.dataset.ph === ph; g.classList.toggle('sel', on); g.setAttribute('aria-pressed', on); });
}
$$('#phCtrl button').forEach(b => b.addEventListener('click', () => setPhase(b.dataset.ph)));
setPhase('b');

/* ---------- hook inspector ---------- */
const HK = {
  dark: { label: 'Valid Eclipse Wave', path: 'dark' },
  public: { label: 'Public swap', path: 'public' },
  amount: { label: 'Wrong amount', path: 'dark', fail: 'amount', err: 'AmountMismatch' },
  replay: { label: 'Replay settled wave', path: 'dark', fail: 'wave', err: 'WaveAlreadySettled' },
  caller: { label: 'Unauthorized caller', path: 'dark', fail: 'caller', err: 'NotDarkExecutor' },
  deadline: { label: 'Deadline passed', path: 'dark', fail: 'deadline', err: 'DeadlineExpired' }
};
const CHECKS = [
  { k: 'caller', t: 'Caller is the registered Eclipse Executor' },
  { k: 'pool', t: 'Pool is registered for Eclipse' },
  { k: 'wave', t: 'Wave is locked and not yet settled' },
  { k: 'root', t: 'Commitment root matches the locked wave' },
  { k: 'amount', t: 'Swap size equals the proven leftover' },
  { k: 'deadline', t: 'Execution deadline not passed' }
];
const LIFE = {
  dark: [['order', 'Eclipse Executor', 'submits wave net'], ['lattice', 'PoolManager', 'swap()'], ['gate', 'beforeSwap', 'verify wave'], ['net', 'Pool swap', 'v4 AMM math'], ['settle', 'afterSwap', 'record · fee'], ['wave', 'Settled', 'receipt published']],
  public: [['lattice', 'Router', 'trader wallet'], ['lattice', 'PoolManager', 'swap()'], ['gate', 'beforeSwap', 'pass-through'], ['net', 'Pool swap', 'v4 AMM math'], ['settle', 'afterSwap', 'no-op'], ['check', 'Done', 'public swap']]
};
const K = s => `<span class="k">${s}</span>`, Cm = s => `<span class="c">${s}</span>`, Fn = s => `<span class="f">${s}</span>`;
const CODE = [
  ['sig', `${K('function')} ${Fn('beforeSwap')}(address sender, PoolKey ${K('calldata')} key,`],
  ['sig', `    SwapParams ${K('calldata')} params, ${K('bytes calldata')} hookData)`],
  ['sig', `    ${K('external')} onlyPoolManager ${K('returns')} (${K('bytes4')}, BeforeSwapDelta, ${K('uint24')})`],
  ['', '{'],
  ['public', `    ${K('if')} (hookData.length == 0) ${K('return')} _pass();      ${Cm('// public path')}`],
  ['decode', `    DarkExecution ${K('memory')} x = abi.decode(hookData, (DarkExecution));`],
  ['caller', `    ${K('if')} (sender != darkExecutor) ${K('revert')} NotDarkExecutor();`],
  ['pool', `    ${K('if')} (!registered[key.toId()]) ${K('revert')} PoolNotRegistered();`],
  ['wave', `    Wave ${K('storage')} w = waves[x.waveId];`],
  ['wave', `    ${K('if')} (w.state != LOCKED) ${K('revert')} WaveAlreadySettled(x.waveId);`],
  ['root', `    ${K('if')} (w.root != x.root) ${K('revert')} RootMismatch();`],
  ['amount', `    ${K('if')} (_abs(params.amountSpecified) != w.provenNet)`],
  ['amount', `        ${K('revert')} AmountMismatch(w.provenNet, _abs(params.amountSpecified));`],
  ['deadline', `    ${K('if')} (block.timestamp > x.deadline) ${K('revert')} DeadlineExpired();`],
  ['ret', `    ${K('return')} (${K('this')}.beforeSwap.selector, ZERO_DELTA, 0);`],
  ['', '}'],
  ['', ''],
  ['after', `${K('function')} ${Fn('afterSwap')}(..., BalanceDelta delta, ${K('bytes calldata')} hookData) ...`],
  ['after', `{   ${K('if')} (hookData.length == 0) ${K('return')} (selector, 0);   ${Cm('// public: no-op')}`],
  ['record', `    w.state = EXECUTED;  w.result = delta;`],
  ['fee', `    ${K('int128')} fee = _fee(delta, FEE_BPS);          ${Cm('// afterSwapReturnDelta')}`],
  ['emit', `    ${K('emit')} DarkWaveExecuted(waveId, delta, w.root);`],
  ['emit', `    ${K('return')} (selector, fee);  }`]
];
const PERMS = [['beforeInitialize', 1], ['afterInitialize', 0], ['beforeAddLiquidity', 0], ['afterAddLiquidity', 0], ['beforeRemoveLiquidity', 0], ['afterRemoveLiquidity', 0], ['beforeSwap', 1], ['afterSwap', 1], ['beforeDonate', 0], ['afterDonate', 0], ['beforeSwapReturnDelta', 0], ['afterSwapReturnDelta', 1], ['afterAddLiquidityReturnDelta', 0], ['afterRemoveLiquidityReturnDelta', 0]];
let hkSel = 'dark', hkBusy = false, hkToken = 0;
$('#hkSc').innerHTML = Object.entries(HK).map(([k, v]) => `<button type="button" role="radio" data-sc="${k}" aria-checked="${k === hkSel}" tabindex="${k === hkSel ? 0 : -1}" class="${v.fail ? 'neg' : ''}">${v.label}</button>`).join('');
$('#hkCode').innerHTML = CODE.map(([k, h], i) => `<span class="ln" data-k="${k}"><i>${String(i + 1).padStart(2, '0')}</i>${h || ' '}</span>`).join('');
if ($('#hkPerms')) $('#hkPerms').innerHTML = PERMS.map(([n, on]) => `<li class="${on ? 'on' : ''}">${on ? icon('check') : icon('dash')}<code>${n}</code></li>`).join('');
function hkLifeRender(path) {
  $('#hkLife').innerHTML = LIFE[path].map(([ic, t, s], i) => `<li data-i="${i}"><span class="hk-n">${icon(ic)}</span><b>${t}</b><small>${s}</small></li>`).join('');
}
function hkReset() {
  const sc = HK[hkSel];
  hkLifeRender(sc.path);
  $('#hkChecks').innerHTML = CHECKS.map(c => `<li data-k="${c.k}"><span class="st"></span><span>${c.t}</span></li>`).join('');
  $$('#hkCode .ln').forEach(l => l.classList.remove('hl', 'bad', 'dim'));
  $('#hkRes').className = 'hk-res'; $('#hkRes').innerHTML = '<span class="muted">Pick a scenario and run the swap through the hook.</span>';
  $('#hk').classList.remove('failed');
}
function selectScenario(k) {
  if (!HK[k]) return; hkSel = k; hkToken++; hkBusy = false;
  $$('#hkSc [role=radio]').forEach(b => { const on = b.dataset.sc === k; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  hkReset();
}
$$('#hkSc [role=radio]').forEach(b => {
  b.addEventListener('click', () => { selectScenario(b.dataset.sc); hkRun(); });
  b.addEventListener('keydown', e => {
    const keys = Object.keys(HK), i = keys.indexOf(hkSel);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const n = keys[(i + 1) % keys.length]; selectScenario(n); $(`#hkSc [data-sc=${n}]`).focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const n = keys[(i - 1 + keys.length) % keys.length]; selectScenario(n); $(`#hkSc [data-sc=${n}]`).focus(); }
  });
});
const hlCode = (k, cls = 'hl') => { $$('#hkCode .ln').forEach(l => { if (cls === 'hl') l.classList.remove('hl'); if (l.dataset.k === k) l.classList.add(cls); }); };
const stage = (i, cls) => { const li = $(`#hkLife li[data-i="${i}"]`); if (li) { li.classList.remove('on', 'done', 'fail', 'dim'); li.classList.add(cls); } };
async function hkRun() {
  const tok = ++hkToken; hkReset(); hkBusy = true;
  const sc = HK[hkSel], path = sc.path, wait = ms => sleep(RM ? 0 : ms).then(() => tok === hkToken);
  const ref = W.hist.find(w => w.res && w.res.net.amtIn > 1e-9) || W.hist[0];
  const net = ref.res.net, netStr = ta(net.amtIn, net.tin);
  $('#hkRes').innerHTML = '<span class="muted">Running…</span>';
  stage(0, 'on'); hlCode('sig'); if (!await wait(360)) return;
  stage(0, 'done'); stage(1, 'on'); if (!await wait(360)) return;
  stage(1, 'done'); stage(2, 'on');
  if (path === 'public') {
    hlCode('public'); $$('#hkChecks li').forEach(l => l.classList.add('skip'));
    if (!await wait(700)) return;
  } else {
    hlCode('decode'); if (!await wait(300)) return;
    for (const c of CHECKS) {
      const li = $(`#hkChecks li[data-k="${c.k}"]`); li.classList.add('run'); hlCode(c.k);
      if (!await wait(300)) return;
      li.classList.remove('run');
      if (sc.fail === c.k) {
        li.classList.add('fail'); hlCode(c.k, 'bad'); stage(2, 'fail');
        for (let i = 3; i < 6; i++) stage(i, 'dim');
        $$(`#hkChecks li`).forEach(l => { if (!l.classList.contains('pass') && !l.classList.contains('fail')) l.classList.add('skip'); });
        $('#hk').classList.add('failed');
        const args = { amount: `(${fmt(net.amtIn, 2)}, ${fmt(net.amtIn * 1.107, 2)})`, wave: `(${ref.id})`, caller: '()', deadline: '()' }[c.k];
        $('#hkRes').className = 'hk-res fail';
        $('#hkRes').innerHTML = `${icon('x')}<div><b>Reverted · <code>${sc.err}${args}</code></b><span>The swap never reached the pool. No balances moved and the wave can be retried or failed safely.</span></div>`;
        hkBusy = false; return;
      }
      li.classList.add('pass');
    }
    hlCode('ret');
  }
  stage(2, 'done'); stage(3, 'on'); if (!await wait(420)) return;
  stage(3, 'done'); stage(4, 'on');
  if (path === 'public') { hlCode('after'); if (!await wait(420)) return; }
  else { for (const k of ['after', 'record', 'fee', 'emit']) { hlCode(k); if (!await wait(260)) return; } }
  stage(4, 'done'); stage(5, 'on');
  $('#hkRes').className = 'hk-res ok';
  $('#hkRes').innerHTML = path === 'public'
    ? `${icon('check')}<div><b>Filled as a normal public swap</b><span>No Eclipse data in hookData, so the hook stayed out of the way. Same pool, same liquidity.</span></div>`
    : `${icon('settle', 'is-on')}<div><b>Filled · Wave #${ref.id} net ${netStr} → ${net.tout}</b><span>6/6 checks passed. afterSwap recorded the delta, took the 5 bps fee and published the settlement root. Simulated.</span></div>`;
  hkBusy = false;
}
$('#hkRun').addEventListener('click', hkRun);
selectScenario('dark');
new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { hkRun(); ob.disconnect(); } }, { threshold: .35 }).observe($('#hk'));

/* ---------- docs view ---------- */
const docsView = $('#docsView'), mainEl = $('#main');
function setNavActive(k) { $$('#navLinks a').forEach(a => a.classList.toggle('active', a.dataset.nav === k)); }
function showLanding() {
  if (mainEl.hidden) { mainEl.hidden = false; docsView.hidden = true; document.title = 'Eclipse'; setNavActive(null); requestAnimationFrame(() => { buildScene(); updateFlow(); }); }
}
function showDocs(sub) {
  const was = docsView.hidden;
  mainEl.hidden = true; docsView.hidden = false; document.title = 'Docs · Eclipse'; setNavActive('docs');
  const t = sub ? document.getElementById('d-' + sub) : null;
  requestAnimationFrame(() => { if (t) t.scrollIntoView({ block: 'start', behavior: was || RM ? 'instant' : 'smooth' }); else scrollTo({ top: 0, behavior: 'instant' }); });
  $('#docsNav').classList.remove('open'); $('#docsToggle').setAttribute('aria-expanded', 'false');
  markDoc(sub || 'overview');
}
function route() {
  const h = location.hash;
  if (h.startsWith('#docs')) { showDocs(h.split('/')[1]); return; }
  if (!mainEl.hidden) return;
  showLanding();
  requestAnimationFrame(() => { const t = h && h.length > 1 && document.getElementById(h.slice(1)); t ? t.scrollIntoView({ block: 'start', behavior: 'instant' }) : scrollTo({ top: 0, behavior: 'instant' }); });
}
addEventListener('hashchange', route);
function markDoc(id) { $$('#docsNav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#docs/' + id)); }
const dio = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !docsView.hidden) markDoc(e.target.id.slice(2)); }); }, { rootMargin: '-20% 0px -70% 0px' });
$$('.ds').forEach(s => dio.observe(s));
$('#docsToggle').addEventListener('click', () => { const o = !$('#docsNav').classList.contains('open'); $('#docsNav').classList.toggle('open', o); $('#docsToggle').setAttribute('aria-expanded', o); });
$('#docsSearch').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  $$('#docsNav .dg').forEach(g => {
    let any = false;
    $$('a', g).forEach(a => { const id = a.getAttribute('href').split('/')[1], sec = document.getElementById('d-' + id); const hit = !q || a.textContent.toLowerCase().includes(q) || (sec && sec.textContent.toLowerCase().includes(q)); a.hidden = !hit; any = any || hit; });
    g.hidden = !any;
  });
});
$('#docsSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $$('#docsNav a').find(x => !x.hidden); if (a) location.hash = a.getAttribute('href'); } });
const secNav = { hook: 'hook', how: 'how', observer: 'how', waves: 'waves', privacy: 'privacy' };
const navIO = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !mainEl.hidden) setNavActive(secNav[e.target.id] || null); }); }, { rootMargin: '-45% 0px -50% 0px' });
['top', 'origin', 'goals', 'hook', 'how', 'observer', 'waves', 'privacy', 'faq'].forEach(id => { const el = document.getElementById(id); if (el) navIO.observe(el); });

/* ---------- metrics ---------- */
const MX = { waves: 0, gross: 0, matched: 0, eff: 0, avoided: 0 }; let mxSeen = false;
const mxFmt = { waves: v => fmt(Math.round(v), 0), avoided: v => fmt(Math.round(v), 0), gross: v => short(v), matched: v => short(v), eff: v => pct(v) };
function mxTarget() {
  const s = W.hist.filter(w => w.res);
  return {
    waves: s.length,
    gross: s.reduce((a, w) => a + w.res.gross, 0),
    matched: s.reduce((a, w) => a + 2 * w.res.matched, 0),
    eff: s.length ? s.reduce((a, w) => a + w.res.eff, 0) / s.length : 0,
    avoided: s.reduce((a, w) => a + w.res.n - (w.res.net.amtIn > 1e-9 ? 1 : 0), 0)
  };
}
function renderMetrics(dur) {
  if (!mxSeen) return;
  const to = mxTarget(), from = { ...MX };
  tween(dur || 700, p => { for (const k in to) { MX[k] = lerp(from[k], to[k], p); const el = $(`[data-mx=${k}]`); if (el) el.textContent = mxFmt[k](MX[k]); } }, E_.out);
}
new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { mxSeen = true; renderMetrics(1400); ob.disconnect(); } }, { threshold: .4 }).observe($('#mx') || document.body);

/* ---------- faq ---------- */
$$('#faqList .qa button').forEach(btn => btn.addEventListener('click', () => {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', open); btn.closest('.qa').classList.toggle('open', open);
}));

/* ---------- floating CTA (mobile) ---------- */
const fab = $('#fab');
function updateFab() {
  const tr = term.getBoundingClientRect(), hr = hero.getBoundingClientRect();
  const show = innerWidth <= 820 && mainEl && !mainEl.hidden && hr.bottom < 0 && !(tr.bottom > 0 && tr.top < innerHeight) && drawerId == null;
  fab.classList.toggle('show', show); fab.setAttribute('aria-hidden', !show); fab.tabIndex = show ? 0 : -1;
}

/* ---------- isometric kit ---------- */
function isoKit(s, ox, oy) {
  const P = (x, y, z) => [ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s];
  const f = v => v.toFixed(1), pts = a => a.map(p => f(p[0]) + ',' + f(p[1])).join(' ');
  return {
    P,
    box(x, y, z, w, d, h, c = '') {
      const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
      const rr = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
      const l = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
      return `<g class="ib ${c}"><polygon class="fl" points="${pts(l)}"/><polygon class="fr" points="${pts(rr)}"/><polygon class="ft" points="${pts(t)}"/></g>`;
    },
    cyl(x, y, z, r, h, c = '') {
      const [cx, cy] = P(x, y, z), [tx, ty] = P(x, y, z + h), rx = 1.2247 * r * s, ry = .7071 * r * s;
      return `<g class="ib ${c}"><path class="fl" d="M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)} L${f(tx + rx)} ${f(ty)} A${f(rx)} ${f(ry)} 0 0 1 ${f(tx - rx)} ${f(ty)} Z"/><ellipse class="ft" cx="${f(tx)}" cy="${f(ty)}" rx="${f(rx)}" ry="${f(ry)}"/></g>`;
    },
    hex(x, y, z, r, h, c = '') {
      const V = [...Array(6)].map((_, i) => { const a = Math.PI / 3 * i + Math.PI / 6; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });
      let side = '';
      for (let i = 0; i < 6; i++) {
        const a = V[i], b = V[(i + 1) % 6], nx = (a[0] + b[0]) / 2 - x, ny = (a[1] + b[1]) / 2 - y;
        if (nx + ny > 0.01) side += `<polygon class="${nx > ny ? 'fr' : 'fl'}" points="${pts([P(a[0], a[1], z), P(b[0], b[1], z), P(b[0], b[1], z + h), P(a[0], a[1], z + h)])}"/>`;
      }
      return `<g class="ib ${c}">${side}<polygon class="ft" points="${pts(V.map(v => P(v[0], v[1], z + h)))}"/></g>`;
    },
    pl(arr, c) { return `<polyline class="${c}" points="${pts(arr.map(p => P(...p)))}"/>`; },
    ln(a, b, c) { const A = P(...a), B = P(...b); return `<line class="${c}" x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}"/>`; }
  };
}
const SPARK = (x, y, s, d) => `<path class="spk" style="--d:${d}ms" transform="translate(${x} ${y}) scale(${s})" d="M0 -6L1.3 -1.3L6 0L1.3 1.3L0 6L-1.3 1.3L-6 0L-1.3 -1.3Z"/>`;
const ISO = {
  wallet() { const k = isoKit(1.55, 70, 44); return k.box(-26, -16, 0, 50, 32, 13) + k.box(-22, -12, 13, 36, 22, 2.5, 'card') + k.box(6, 16, 3.5, 13, 3, 6, 'acc') + k.ln([-26, 6, 13], [24, 6, 13], 'seam'); },
  pool() { const k = isoKit(1.25, 70, 30); let g = k.box(-30, -30, 0, 60, 60, 7); for (const i of [-15, 0, 15]) { g += k.ln([i, -30, 7], [i, 30, 7], 'grid') + k.ln([-30, i, 7], [30, i, 7], 'grid'); } return g + k.cyl(0, 0, 7, 7, 4, 'acc'); },
  wave() { const k = isoKit(1.45, 70, 62); return k.cyl(0, 0, 0, 25, 7) + k.cyl(4, -4, 7, 18, 7) + k.cyl(8, -8, 14, 11, 7, 'acc'); },
  net() { const k = isoKit(1.35, 66, 40); return k.box(-32, -24, 0, 64, 48, 4) + k.box(-28, -18, 4, 24, 5, 4) + k.box(-28, -3, 4, 24, 5, 4) + k.box(-28, 12, 4, 24, 5, 4) + k.box(-2, -6, 4, 30, 11, 8, 'acc'); },
  settle() { const k = isoKit(1.5, 70, 48); return k.hex(0, 0, 0, 27, 12) + k.pl([[-12, 2, 12], [-3, 11, 12], [14, -8, 12]], 'chk'); }
};
$$('[data-iso]').forEach(el => {
  el.innerHTML = `<svg viewBox="0 0 140 112" aria-hidden="true">${ISO[el.dataset.iso]()}${SPARK(20, 24, 1, 0)}${SPARK(120, 28, .75, 90)}${SPARK(114, 90, .9, 170)}${SPARK(24, 88, .6, 240)}</svg>`;
});

/* ---------- faceted aperture (shards) ---------- */
const shardSvg = $('#shards'); let shards = [], shardP = 1, shardVisible = false;
(function buildShards() {
  const R = 118, pol = (r, a) => ({ x: Math.cos(a * Math.PI / 180) * r, y: Math.sin(a * Math.PI / 180) * r });
  const A = [...Array(16)].map((_, i) => pol(R, i * 22.5 - 90)), B = [...Array(8)].map((_, i) => pol(R * .56, i * 45 - 90 + 22.5)), C = { x: -12, y: 12 };
  const tris = [];
  for (let i = 0; i < 16; i++) tris.push([A[i], A[(i + 1) % 16], B[Math.floor(i / 2)]]);
  for (let jj = 0; jj < 8; jj++) tris.push([B[jj], B[(jj + 1) % 8], A[(2 * jj + 2) % 16]]);
  for (let jj = 0; jj < 8; jj++) tris.push([C, B[jj], B[(jj + 1) % 8]]);
  const sh = { x: 30, y: -30, r: 104 }, rr = rng(77), pal = ['#F1EEFF', '#DCD4FF', '#C3B8FF', '#AA9CFF', '#9483FA', '#7E6EF0'];
  let html = `<circle r="${R + 14}" class="sh-ring"/><circle r="${R + 26}" class="sh-ring d"/>`;
  tris.forEach((t, i) => {
    const cx = (t[0].x + t[1].x + t[2].x) / 3, cy = (t[0].y + t[1].y + t[2].y) / 3;
    const dark = Math.hypot(cx - sh.x, cy - sh.y) < sh.r;
    const L = Math.hypot(cx, cy) || 1, dist = 22 + rr() * 46;
    const lit = clamp(Math.round(((cx - cy) / (R * 2) + .5) * (pal.length - 1) + (rr() - .5) * 1.4), 0, pal.length - 1);
    const fill = dark ? '#07070C' : pal[pal.length - 1 - lit];
    const pts = t.map(p => `${(p.x - cx).toFixed(1)},${(p.y - cy).toFixed(1)}`).join(' ');
    html += `<g class="shard${dark ? ' dk' : ''}" data-i="${i}"><polygon points="${pts}" fill="${fill}"/></g>`;
    shards.push({ cx, cy, dx: cx / L * dist + (rr() - .5) * 14, dy: cy / L * dist + (rr() - .5) * 14, rot: (rr() - .5) * 70, d: rr() * .35 });
  });
  shardSvg.innerHTML = html;
  shards.forEach((s, i) => { s.el = shardSvg.querySelector(`.shard[data-i="${i}"]`); s.poly = s.el.firstChild; });
})();
function drawShards(p) {
  shardP = p;
  shards.forEach(s => {
    const q = clamp((p - s.d * (1 - p)) , 0, 1), e = E_.io(q);
    s.el.setAttribute('transform', `translate(${(s.cx + s.dx * e).toFixed(2)} ${(s.cy + s.dy * e).toFixed(2)}) rotate(${(s.rot * e).toFixed(2)})`);
    s.poly.setAttribute('fill-opacity', (1 - .78 * e).toFixed(3));
  });
  shardSvg.classList.toggle('apart', p > .5);
}
drawShards(RM ? 0 : 1);
new IntersectionObserver(es => { shardVisible = es[0].isIntersecting; }, { threshold: .3 }).observe(shardSvg);
(async function shardLoop() {
  for (;;) {
    if (RM) { drawShards(0); await sleep(800); continue; }
    if (!shardVisible) { await sleep(300); continue; }
    if (shardP > .5) { await tween(1300, p => drawShards(1 - p), E_.out); await sleep(2800); }
    else { await tween(1000, p => drawShards(p), E_.io); await sleep(1300); }
  }
})();
const originEl = $('#origin');
new IntersectionObserver(es => originEl.classList.toggle('inview', es[0].isIntersecting), { threshold: .2 }).observe(originEl);

/* ---------- isometric phase path ---------- */
(function buildPhasePath() {
  const svg = $('#phasePath'), k = isoKit(1.9, 0, 0), W0 = 46, H0 = 10;
  const PL = [
    { ph: 'a', x: 0, y: 0, n: 'Layer 1', t: 'Batch Auctions' },
    { ph: 'b', x: 96, y: -44, n: 'Layer 2', t: 'Encrypted Orders' },
    { ph: 'c', x: 182, y: -124, n: 'Layer 3', t: 'ZK Validity Proofs' },
    { ph: 'd', x: 276, y: -168, n: 'Layer 4', t: 'Shielded Funding' }
  ];
  const c = p => [p.x + W0 / 2, p.y + W0 / 2, 0];
  const route = [];
  PL.forEach((p, i) => { route.push(c(p)); if (i < PL.length - 1) { const q = PL[i + 1]; route.push([q.x + W0 / 2, p.y + W0 / 2, 0]); } });
  const pts = route.map(p => k.P(...p)), d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const obj = {
    a: p => k.box(p.x + 13, p.y + 13, H0, 20, 20, 20, 'wire'),
    b: p => k.box(p.x + 11, p.y + 14, H0, 24, 18, 9, 'obj') + k.ln([p.x + 15, p.y + 32, H0 + 4.5], [p.x + 31, p.y + 32, H0 + 4.5], 'seam'),
    c: p => k.hex(p.x + 23, p.y + 23, H0, 13, 9, 'obj') + k.pl([[p.x + 18, p.y + 25, H0 + 9], [p.x + 22, p.y + 29, H0 + 9], [p.x + 30, p.y + 19, H0 + 9]], 'chk'),
    d: p => k.cyl(p.x + 23, p.y + 23, H0, 13, 6, 'obj') + k.cyl(p.x + 26, p.y + 20, H0 + 6, 8, 6, 'acc')
  };
  let html = `<path class="tube-o" d="${d}"/><path class="tube-i" d="${d}"/><path class="tube-l" id="tubeL" d="${d}"/>`;
  PL.forEach(p => {
    const lab = k.P(p.x + W0, p.y + W0, 0);
    html += `<g class="plat" data-ph="${p.ph}" tabindex="0" role="button" aria-pressed="false" aria-label="${p.n}, ${p.t}"><g class="pf">${k.box(p.x, p.y, 0, W0, W0, H0, 'base')}${obj[p.ph](p)}</g>
      <text class="pp-n" x="${(lab[0] + 8).toFixed(1)}" y="${(lab[1] + 4).toFixed(1)}">${p.n}</text><text class="pp-t" x="${(lab[0] + 8).toFixed(1)}" y="${(lab[1] + 20).toFixed(1)}">${p.t}</text></g>`;
  });
  svg.innerHTML = html;
  const bb = svg.getBBox();
  svg.setAttribute('viewBox', `${(bb.x - 16).toFixed(0)} ${(bb.y - 16).toFixed(0)} ${(bb.width + 32).toFixed(0)} ${(bb.height + 32).toFixed(0)}`);
  const tl = $('#tubeL'), L = tl.getTotalLength(); tl.style.setProperty('--L', L.toFixed(0)); tl.style.strokeDasharray = `46 ${L.toFixed(0)}`;
  $$('.plat', svg).forEach(g => {
    g.addEventListener('click', () => setPhase(g.dataset.ph));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPhase(g.dataset.ph); } });
  });
})();
setPhase('b');

/* ---------- watching eyes ---------- */
(function buildEyes() {
  const box = $('#eyes'); if (!box) return;
  const spec = [[0, 12, 1], [36, 0, .78], [66, 16, 1.18], [108, 4, .7], [138, 18, .95], [176, 2, .8], [206, 14, 1.05], [244, 6, .7]];
  box.innerHTML = spec.map(([x, y, s]) => `<svg class="eye" style="left:${x}px;top:${y}px;width:${(30 * s).toFixed(1)}px" viewBox="-12 -8 24 16"><g class="lid"><path class="al" d="M-11 0Q0 -9.6 11 0Q0 9.6 -11 0Z"/><g class="pu"><circle r="3.9"/><circle class="pd" r="1.6"/></g></g></svg>`).join('');
  const eyes = $$('.eye', box).map(el => ({ el, pu: el.querySelector('.pu') }));
  let mx = -1, my = -1, raf = 0;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(look); }, { passive: true });
  function look() {
    raf = 0; if (RM) return;
    eyes.forEach(o => { const r = o.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const cx = r.left + r.width / 2, cy = r.top + r.height / 2, a = Math.atan2(my - cy, mx - cx), d = Math.min(1, Math.hypot(mx - cx, my - cy) / 240); o.pu.setAttribute('transform', `translate(${(Math.cos(a) * 4.6 * d).toFixed(2)} ${(Math.sin(a) * 2.6 * d).toFixed(2)})`); });
  }
  setInterval(() => { if (RM || box.classList.contains('closed')) return; const o = eyes[Math.floor(Math.random() * eyes.length)]; o.el.classList.add('blink'); setTimeout(() => o.el.classList.remove('blink'), 170); }, 1400);
})();

/* ---------- spotlight borders ---------- */
$$('.spot').forEach(el => el.addEventListener('pointermove', e => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true }));

/* ---------- boot ---------- */
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => { ticking = false; nav.classList.toggle('scrolled', scrollY > 8); updateFlow();
    updateFab(); const max = document.documentElement.scrollHeight - innerHeight; $('#navProg').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`; });
}
addEventListener('scroll', onScroll, { passive: true });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { buildScene(); updateFlow(); closePop(false); }, 150); });
mq.addEventListener && mq.addEventListener('change', e => { RM = e.matches; buildScene(); updateFlow(); });

buildTrack('dark');
render(); renderTable(); initFlow(); updateFlow(); route();
requestAnimationFrame(() => { buildScene(); requestAnimationFrame(driftLoop); });
setTimeout(buildScene, 1300); // after hero entrance & fonts settle
document.fonts && document.fonts.ready.then(buildScene);
requestAnimationFrame(frame);
})();
