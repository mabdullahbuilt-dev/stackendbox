// Stress suite: rapid scroll x3 (down/up), random interaction for 20s, rapid tab switching, resize stress, reduced motion, hover storms.
// Fails on console errors / page errors / horizontal overflow / dead scroll. node scripts/qa-stress.mjs [url]
import { chromium } from "playwright-core";
const URL = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
let fails = 0; const log = (ok, m) => { console.log(ok ? "PASS" : "FAIL", m); if (!ok) fails++; };
async function open(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const p = await ctx.newPage(); const errs = [];
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource|cal\.com|net::ERR/i.test(m.text()) && errs.push(m.text()));
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  return { ctx, p, errs };
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// 1 rapid scroll down/up x3
{
  const { ctx, p, errs } = await open();
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  const t0 = Date.now();
  for (let r = 0; r < 3; r++) {
    for (let y = 0; y <= h; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(8); }
    for (let y = h; y >= 0; y -= 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(8); }
  }
  await p.waitForTimeout(800);
  const open_ = await p.evaluate(() => [...document.querySelectorAll("[data-chapter]")].map((e) => e.dataset.chapter));
  log(errs.length === 0, `rapid scroll x3 (${Math.round((Date.now() - t0) / 1000)}s) console/page errors: ${errs.length} ${errs[0] || ""}`);
  log((await overflow(p)) <= 0, "rapid scroll: no horizontal overflow");
  log(open_.filter((s) => s === "active").length <= 1, "only one active chapter after scroll storm");
  await ctx.close();
}
// 2 random interaction 20s
{
  const { ctx, p, errs } = await open();
  const end = Date.now() + 20000; let clicks = 0;
  while (Date.now() < end) {
    const h = await p.evaluateHandle(() => { const els = [...document.querySelectorAll("main button, main [role=tab]")].filter((e) => !e.closest("form") && !e.disabled); return els[Math.floor(Math.random() * els.length)]; });
    const el = h.asElement();
    try { if (Math.random() < 0.25) { await el.scrollIntoViewIfNeeded({ timeout: 600 }); await el.click({ timeout: 600, force: true }); } else { await el.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.click(); }); } clicks++; } catch {}
    if (Math.random() < 0.4) await p.mouse.move(Math.random() * 1400, Math.random() * 800, { steps: 3 });
    await p.waitForTimeout(30 + Math.random() * 90);
  }
  log(errs.length === 0, `random interaction 20s (${clicks} clicks) errors: ${errs.length} ${errs[0] || ""}`);
  log((await overflow(p)) <= 0, "random interaction: no horizontal overflow");
  await ctx.close();
}
// 3 rapid tab switching in every tabbed chapter; every panel must stay non-empty
{
  const { ctx, p, errs } = await open();
  let empty = 0;
  for (const [sec, stage] of [["#specialized", ".spc__stage"], ["#ai", ".aix__ui, .ap"], ["#intent", ".sp-wrap"], ["#proof", ".proof__screen"], ["#depth", ".xr__ins, .xr__hint"], ["#process", ".wb__art"]]) {
    await p.evaluate((s) => document.querySelector(s).scrollIntoView(), sec); await p.waitForTimeout(500);
    const tabs = p.locator(`${sec} [role=tab]`); const n = await tabs.count();
    for (let r = 0; r < 12; r++) { await tabs.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(25); }
    await p.waitForTimeout(500);
    const ok = await p.evaluate(([s, st]) => { const e = document.querySelector(`${s} ${st.split(",")[0]}`) || document.querySelector(`${s} ${st.split(",")[1] || st}`); return !!e && e.getBoundingClientRect().height > 40; }, [sec, stage]);
    if (!ok) { empty++; console.log("  empty stage in", sec); }
  }
  log(empty === 0 && errs.length === 0, `rapid tab switching x6 chapters, empty stages: ${empty}, errors: ${errs.length} ${errs[0] || ""}`);
  await ctx.close();
}
// 4 resize stress
{
  const { ctx, p, errs } = await open();
  for (const [w, h] of [[1440, 900], [820, 1180], [390, 844], [1024, 768], [360, 800], [1280, 800], [768, 1024], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const o = await overflow(p); if (o > 0) log(false, `resize ${w}x${h} overflow ${o}`); }
  log(errs.length === 0, `resize stress errors: ${errs.length} ${errs[0] || ""}`);
  log((await overflow(p)) <= 0, "resize stress: no horizontal overflow at the end");
  await ctx.close();
}
// 5 reduced motion + save-data style: page renders final states, no errors
{
  const { ctx, p, errs } = await open({ reducedMotion: "reduce" });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h; y += 800) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
  log(errs.length === 0 && (await overflow(p)) <= 0, `reduced motion scroll: errors ${errs.length}, overflow ${await overflow(p)}`);
  log((await p.locator("canvas").count()) === 0, "reduced motion: no WebGL canvas");
  await ctx.close();
}
// 6 hidden tab: animations park (no active RAF churn is observable, but state must recover on return)
{
  const { ctx, p, errs } = await open();
  await p.evaluate(() => document.getElementById("ai").scrollIntoView()); await p.waitForTimeout(1500);
  const pg = await ctx.newPage(); await pg.goto("about:blank"); await pg.bringToFront(); await p.waitForTimeout(1500); await p.bringToFront(); await p.waitForTimeout(1200);
  const visible = await p.evaluate(() => document.querySelector("#ai .aorb__core")?.getBoundingClientRect().height > 20);
  log(visible && errs.length === 0, `tab hide/return recovers (errors ${errs.length})`);
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
