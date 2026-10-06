// node scripts/shot-seams.mjs <outdir> [w] [h]  : viewport screenshot with each chapter boundary at 45% of the viewport
import { chromium } from "playwright-core";
import fs from "node:fs";
const [out, w = "1440", h = "900"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 700, hasTouch: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
const ids = await p.evaluate(() => [...document.querySelectorAll("main > section[id]")].map((s) => s.id));
for (let i = 1; i < ids.length; i++) {
  await p.evaluate(([id, f]) => { const e = document.getElementById(id); scrollTo(0, scrollY + e.getBoundingClientRect().top - innerHeight * f); }, [ids[i], 0.45]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${String(i).padStart(2, "0")}-${ids[i - 1]}-${ids[i]}.png` });
}
await b.close(); console.log(ids.join(","));
