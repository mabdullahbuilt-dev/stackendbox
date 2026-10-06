// node scripts/shot-tabs.mjs <sectionId> <stageSelector> <tabSelector> <outPrefix> [w] [h] [wait]
import { chromium } from "playwright-core";
const [id, stage, tabSel, out, w = "1440", h = "900", wait = "2200"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 700, hasTouch: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); scrollTo(0, scrollY + r.top - Math.max(70, (innerHeight - r.height) / 2)); }, stage);
await p.waitForTimeout(500);
const n = await p.locator(tabSel).count();
for (let i = 0; i < n; i++) { await p.locator(tabSel).nth(i).click(); await p.waitForTimeout(+wait); await p.locator(stage).screenshot({ path: `${out}-${i}.png` }); }
await b.close();
