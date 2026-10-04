// node scripts/shot-hero.mjs <w> <h> <out> [moveCursor]  top-of-page screenshot, optionally after moving the cursor across the hero
import { chromium } from "playwright-core";
const [w, h, out, move] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
if (move) { for (let i = 0; i < 24; i++) { await p.mouse.move(150 + i * 40, 250 + Math.sin(i / 3) * 90); await p.waitForTimeout(40); } }
await p.screenshot({ path: out });
await b.close();
