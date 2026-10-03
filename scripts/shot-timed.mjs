// node scripts/shot-timed.mjs <selector> <w> <h> <outprefix> <t1,t2,...>  scroll the element into view, then clip-screenshot it at given ms offsets
import { chromium } from "playwright-core";
const [sel, w, h, out, times] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, scrollY + e.getBoundingClientRect().top - (innerHeight - e.getBoundingClientRect().height) / 2); }, sel);
const box = await p.locator(sel).first().boundingBox();
const t0 = Date.now(); let i = 0;
for (const t of times.split(",").map(Number)) { const wait = t - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait); await p.screenshot({ path: `${out}-${i++}.png`, clip: box, animations: "allow" }); }
await b.close();
