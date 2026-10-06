// AI orbit evidence: idle orbit frame, each scenario, plus three moments of the same scenario. node scripts/shot-ai.mjs <out> [WxH]
import { chromium } from "playwright-core";
import fs from "node:fs";
const [out, vp = "1366x768"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H * 0.45; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate(() => { const e = document.getElementById("ai"); scrollTo(0, scrollY + e.getBoundingClientRect().top); });
await p.waitForTimeout(300); await p.screenshot({ path: `${out}/ai-idle.png` });
await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/ai-support-run.png` });
await p.waitForTimeout(5200); await p.screenshot({ path: `${out}/ai-support-done.png` });
for (const t of ["Documents", "Media", "Intelligence"]) {
  await p.getByRole("tab", { name: t }).click(); await p.mouse.move(5, 5);
  await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/ai-${t.toLowerCase()}.png` });
}
await b.close();
