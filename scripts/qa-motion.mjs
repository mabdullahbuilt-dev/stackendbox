// MOTION REPLAY / REVERSE SUITE. Proves chapters animate forward, reverse on upward scroll, and replay on every visit,
// and that timers, rAF loops and listeners do not multiply across visits. node scripts/qa-motion.mjs [url] [w] [h]
import { chromium } from "playwright-core";
const [URL = "http://localhost:3100", W = "1440", H = "900"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
let fails = 0; const log = (ok, m) => { console.log(ok ? "PASS" : "FAIL", m); if (!ok) fails++; };
const instrument = () => {
  const w = window; w.__qa = { intervals: new Set(), timeouts: 0, raf: 0, listeners: 0 };
  const si = w.setInterval, ci = w.clearInterval, rf = w.requestAnimationFrame;
  w.setInterval = (...a) => { const id = si(...a); w.__qa.intervals.add(id); return id; };
  w.clearInterval = (id) => { w.__qa.intervals.delete(id); return ci(id); };
  w.requestAnimationFrame = (cb) => { w.__qa.raf++; return rf(cb); };
  for (const T of [Window.prototype, Document.prototype, Element.prototype]) {
    const add = T.addEventListener, rem = T.removeEventListener;
    T.addEventListener = function (...a) { w.__qa.listeners++; return add.apply(this, a); };
    T.removeEventListener = function (...a) { w.__qa.listeners--; return rem.apply(this, a); };
  }
};
// probes: a number that represents the visible narrative state of each chapter
const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const idx = (s) => [...document.querySelectorAll(s)].findIndex((e) => e.dataset.st === "active");
  return {
    product: +(q("#product")?.dataset.s ?? -1),
    business: idx("#business .ops__stories li:not(.ops__cta)"),
    transform: ["scatter", "flag", "merge", "converge", "system"].indexOf(q("#transform .mt")?.dataset.phase),
    integrations: document.querySelectorAll('#integrations .ixops__r[data-st="ok"]').length,
    rescue: +(q("#rescue .rx")?.dataset.step ?? -1),
    depth: +(q("#depth")?.dataset.step ?? -1),
    process: +(q("#process .wb")?.dataset.s ?? -1),
    delivery: document.querySelectorAll('#delivery .why__path li[data-st="done"]').length,
    cycles: Object.fromEntries([...document.querySelectorAll("main > section[id]")].map((s) => [s.id, +(s.dataset.cycle || 0)])),
  };
})()`;
const ctx = await b.newContext({ viewport: { width: +W, height: +H } });
await ctx.addInitScript(instrument);
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && !/Failed to load resource|cal\.com|net::ERR/.test(m.text()) && errs.push(m.text()));
await p.goto(URL, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const sweep = async (down) => {
  const seen = {};
  const stepPx = Math.round(+H * 0.18);
  const ys = []; for (let y = 0; y <= total; y += stepPx) ys.push(y); if (!down) ys.reverse();
  for (const y of ys) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await p.waitForTimeout(60);
    const s = await p.evaluate(PROBE);
    for (const [k, v] of Object.entries(s)) { if (k === "cycles") continue; (seen[k] ??= []); if (seen[k].at(-1) !== v) seen[k].push(v); }
  }
  return seen;
};
const mono = (arr, dir) => { const a = arr.filter((v) => v >= 0); let ok = true; for (let i = 1; i < a.length; i++) if (dir > 0 ? a[i] < a[i - 1] : a[i] > a[i - 1]) ok = false; return ok && a.length >= 2; };
const snaps = [];
for (let cycle = 1; cycle <= 3; cycle++) {
  const d = await sweep(true);
  const u = await sweep(false);
  for (const k of Object.keys(d)) {
    const ad = d[k].filter((v) => v >= 0), au = u[k].filter((v) => v >= 0);
    log(mono(d[k], 1) && Math.max(...ad) > Math.min(...ad), `pass ${cycle} down: ${k} plays forward ${JSON.stringify(ad)}`);
    log(mono(u[k], -1) && Math.max(...au) > Math.min(...au), `pass ${cycle} up: ${k} reverses ${JSON.stringify(au)}`);
  }
  const st = await p.evaluate(() => ({ intervals: window.__qa.intervals.size, listeners: window.__qa.listeners }));
  const c = (await p.evaluate(PROBE)).cycles;
  snaps.push({ ...st, c });
}
const c1 = snaps[0].c, c3 = snaps[2].c;
const replayed = Object.keys(c3).filter((k) => k !== "hero").every((k) => c3[k] >= c1[k] + 2);
log(replayed, `every chapter counted a new visit on each pass (cycle counters ${JSON.stringify(c3)})`);
log(snaps[2].intervals <= snaps[1].intervals, `active intervals do not multiply across visits (${snaps.map((s) => s.intervals).join(" -> ")})`);
log(snaps[2].listeners <= snaps[0].listeners + 4, `net event listeners stable across visits (${snaps.map((s) => s.listeners).join(" -> ")})`);
// idle rAF: nothing should spin when the page rests at the top (hero only)
await p.evaluate(() => document.getElementById("delivery").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(1500);
const r0 = await p.evaluate(() => window.__qa.raf); await p.waitForTimeout(2000); const r1 = await p.evaluate(() => window.__qa.raf);
log(r1 - r0 < 30, `idle while reading (Why chapter): requestAnimationFrame calls in 2s = ${r1 - r0}`);
// rapid top/bottom x3
for (let i = 0; i < 3; i++) { await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(80); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(80); }
await p.waitForTimeout(600);
log(errs.length === 0, `rapid top/bottom x3 and sweeps: no console/page errors (${errs.length}) ${errs[0] || ""}`);
// mid-scene resize: progress recomputes, nothing breaks
await p.evaluate(() => document.getElementById("business").scrollIntoView()); await p.evaluate(() => scrollBy(0, innerHeight * 0.6)); await p.waitForTimeout(300);
const before = (await p.evaluate(PROBE)).business;
await p.setViewportSize({ width: 1100, height: 800 }); await p.waitForTimeout(500); await p.setViewportSize({ width: +W, height: +H }); await p.waitForTimeout(500);
const after = (await p.evaluate(PROBE)).business;
log(before >= 0 && after >= 0, `resize mid-scene keeps a valid business state (${before} -> ${after})`);
// hidden tab: return is not counted as a new visit
const cyc = (await p.evaluate(PROBE)).cycles.business;
const other = await ctx.newPage(); await other.goto("about:blank"); await other.bringToFront(); await p.waitForTimeout(800); await p.bringToFront(); await p.waitForTimeout(800);
log((await p.evaluate(PROBE)).cycles.business === cyc, "tab hide/return does not replay the chapter");
// refresh at top: hero starts from its initial state
await p.evaluate(() => scrollTo(0, 0)); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
const heroTop = await p.evaluate(() => ({ y: scrollY, motion: document.getElementById("hero")?.dataset.motion }));
log(heroTop.y === 0 && heroTop.motion === "active", `refresh at top: hero active at its start (${JSON.stringify(heroTop)})`);
// refresh mid-page: chapters above are resolved, the current one is deterministic, no errors
await p.evaluate(() => document.getElementById("ai").scrollIntoView({ behavior: "instant" })); await p.waitForTimeout(300);
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
const mid = await p.evaluate(PROBE);
const midY = await p.evaluate(() => [scrollY, document.getElementById("ai").getBoundingClientRect().top]);
console.log("  restored at", JSON.stringify(midY));
log(mid.product === 12 && mid.business === 3 && mid.transform === 4, `refresh mid-page: earlier chapters render their final states (product ${mid.product}, business ${mid.business}, manual ${mid.transform})`);
log(errs.length === 0, `no errors after reloads (${errs.length})`);
await ctx.close();
// reduced motion: final, understandable states without scrolling through
const rc = await b.newContext({ viewport: { width: +W, height: +H }, reducedMotion: "reduce" });
const rp = await rc.newPage(); await rp.goto(URL, { waitUntil: "networkidle" }); await rp.waitForTimeout(800);
const rs = await rp.evaluate(PROBE);
log(rs.product === 12 && rs.business === 3 && rs.transform === 4 && rs.process === 4 && rs.rescue >= 8, `reduced motion: scenes show resolved states ${JSON.stringify({ product: rs.product, business: rs.business, transform: rs.transform, process: rs.process, rescue: rs.rescue })}`);
await rc.close(); await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
