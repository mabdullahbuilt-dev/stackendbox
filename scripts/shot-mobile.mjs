// node scripts/shot-mobile.mjs <outdir> [--engine=chromium|webkit] [WxH@dpr ...]
// Per chapter, per viewport: screenshots at the section start, middle and end of its scroll range (touch emulation).
import { chromium, webkit } from "playwright-core";
const args = process.argv.slice(2);
const out = args[0];
const ENGINE = (args.find((a) => a.startsWith("--engine=")) ?? "--engine=chromium").split("=")[1];
const URL = process.env.URL || "http://localhost:3100/";
const sizes = args.filter((a) => /^\d+x\d+/.test(a)).map((a) => { const [wh, d = "2"] = a.split("@"); return [...wh.split("x").map(Number), +d]; });
const IDS = ["hero", "services", "intent", "product", "business", "transform", "ai", "integrations", "specialized", "proof", "work", "rescue", "depth", "process", "delivery", "start", "final"];
const launcher = ENGINE === "webkit" ? webkit : chromium;
const b = await launcher.launch(ENGINE === "chromium" ? { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" } : {});
for (const [w, h, dpr] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(1200);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 450) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
  for (const id of IDS) {
    const r = await p.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const t = scrollY + e.getBoundingClientRect().top; return { t, h: e.getBoundingClientRect().height }; }, id);
    if (!r) continue;
    const span = Math.max(0, r.h - h);
    const stops = span > h * 0.6 ? [0, span / 2, span] : [0];
    let k = 0;
    for (const s of stops) {
      await p.evaluate((y) => scrollTo(0, y), Math.round(r.t + s));
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${out}/${w}x${h}-${String(IDS.indexOf(id)).padStart(2, "0")}-${id}-${k++}.png` });
    }
  }
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${w}x${h}-99-footer-0.png` });
  await ctx.close();
}
await b.close();
