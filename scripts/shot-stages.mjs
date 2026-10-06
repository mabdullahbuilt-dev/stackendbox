// Frames through a pinned chapter at evenly spaced progress points: node scripts/shot-stages.mjs <out> <WxH> <id> <n>
import { chromium } from "playwright-core";
const [out, vp, id, n = "5"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
const [top, run] = await p.evaluate((id) => { const e = document.getElementById(id); return [scrollY + e.getBoundingClientRect().top, Math.max(1, e.offsetHeight - innerHeight)]; }, id);
for (let i = 0; i < +n; i++) { const q = (i + 0.5) / +n; await p.evaluate((y) => scrollTo(0, y), Math.round(top + run * q)); await p.waitForTimeout(1300); await p.screenshot({ path: `${out}-${i}.png` }); }
await b.close();
