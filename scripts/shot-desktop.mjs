// node scripts/shot-desktop.mjs <outdir>  full-page desktop baseline at 4 widths (pointer: fine), settled
import { chromium } from "playwright-core";
const out = process.argv[2];
const URL = process.env.URL || "http://localhost:3100/";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
for (const [w, h] of [[1536, 864], [1440, 900], [1366, 768], [1280, 800]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(1500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const stops = [["hero", "#hero"], ["services", "#services"], ["intent", "#intent"], ["product", "#product"], ["business", "#business"], ["transform", "#transform"], ["ai", "#ai"], ["integrations", "#integrations"], ["specialized", "#specialized"], ["proof", "#proof"], ["work", "#work"], ["depth", "#depth"], ["process", "#process"], ["delivery", "#delivery"], ["start", "#start"], ["footer", "footer"]];
  for (let y = 0; y < H; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
  for (const [n, sel] of stops) {
    const ok = await p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return false; scrollTo(0, scrollY + e.getBoundingClientRect().top - 70); return true; }, sel);
    if (!ok) continue;
    await p.waitForTimeout(2200);
    await p.screenshot({ path: `${out}/${w}-${n}.png` });
  }
  await p.close();
}
await b.close();
