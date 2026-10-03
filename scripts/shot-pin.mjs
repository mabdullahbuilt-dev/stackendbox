// node scripts/shot-pin.mjs <sectionSelector> <w> <h> <outprefix> [steps]  screenshots a pinned scene at 0..100% of its scroll range
import { chromium } from "playwright-core";
const [sec, w, h, out, steps = "5"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
const r = await p.evaluate((s) => { const sp = document.querySelector(s).closest(".pin-spacer") ?? document.querySelector(s); const top = sp.getBoundingClientRect().top + scrollY; return { top, h: sp.getBoundingClientRect().height }; }, sec);
const range = r.h - +h;
console.log("pin range", Math.round(range));
for (let i = 0; i <= +steps; i++) { const y = r.top + (range * i) / +steps; await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(900); await p.screenshot({ path: `${out}-${i}.png` }); }
await b.close();
