// Screenshot at exact scroll offsets: node scripts/shot-at.mjs <out> <WxH> y1 y2 ...
import { chromium } from "playwright-core";
const [out, vp, ...ys] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
for (const y of ys) { await p.evaluate((y) => scrollTo(0, +y), y); await p.waitForTimeout(+(process.env.WAIT || 600)); await p.screenshot({ path: `${out}-${y}.png` }); }
await b.close();
