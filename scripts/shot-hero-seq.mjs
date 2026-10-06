// Hero sequence evidence: frames down through the hero runway, back up, away to another chapter, then a second pass.
// node scripts/shot-hero-seq.mjs <outdir> [WxH]
import { chromium } from "playwright-core";
import fs from "node:fs";
const [out, vp = "1440x900"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.mouse.move(200, 200); await p.mouse.wheel(0, 1); await p.waitForTimeout(4500);
const run = await p.evaluate(() => { const t = document.getElementById("hero"); return t.offsetHeight - innerHeight; });
const live = await p.evaluate(() => document.querySelector(".hero__canvas")?.dataset.ready ?? "none");
console.log("runway px", run, "canvas", live);
const frame = async (name, y) => {
  await p.evaluate((y) => scrollTo(0, y), y);
  for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, 0); await p.waitForTimeout(120); }
  await p.waitForTimeout(+(process.env.WAIT || 2500));
  await p.screenshot({ path: `${out}/${name}.png` });
  const cap = await p.evaluate(() => document.querySelector(".hero__cap")?.textContent || "");
  console.log(name, y, cap);
};
const ps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
for (const q of ps) await frame(`a-down-${q}`, Math.round(run * q));
for (const q of [0.6, 0.3, 0]) await frame(`b-up-${q}`, Math.round(run * q));
await p.evaluate(() => document.getElementById("ai").scrollIntoView()); await p.waitForTimeout(1500);
await frame("c-away-ai", await p.evaluate(() => scrollY));
for (const q of [0, 0.3, 0.6, 0.9]) await frame(`d-second-${q}`, Math.round(run * q));
await b.close();
