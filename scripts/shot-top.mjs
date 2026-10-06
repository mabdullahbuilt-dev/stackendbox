// node scripts/shot-top.mjs <out> [w] [h] [waitMs]  : top-of-page screenshot (hero + nav) after the 3D scene loads
import { chromium } from "playwright-core";
const [out, w = "1440", h = "900", wait = "9000"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 700, hasTouch: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.mouse.move(200, 200); await p.mouse.move(300, 260);
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
await b.close();
