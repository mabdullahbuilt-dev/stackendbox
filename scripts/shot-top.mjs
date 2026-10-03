// node scripts/shot-top.mjs <w> <h> <out> [interact]  hero screenshot, optionally after pointer activity
import { chromium } from "playwright-core";
const [w, h, out, interact] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
if (interact) { await p.mouse.move(900, 400); await p.mouse.move(920, 420); await p.waitForTimeout(4500); }
else await p.waitForTimeout(1200);
await p.screenshot({ path: out });
await b.close();
