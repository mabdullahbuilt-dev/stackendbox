// node scripts/shot-full.mjs <w> <h> <out.png> [url]  scrolls whole page then screenshots element ranges for #work etc.
import { chromium } from "playwright-core";
const [w, h, id, out, url = "http://localhost:3100"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 300) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
await p.evaluate((id) => { const e = document.getElementById(id); window.scrollTo(0, window.scrollY + e.getBoundingClientRect().top - 70); }, id);
await p.waitForTimeout(3000);
await (await p.$("#" + id)).screenshot({ path: out });
await b.close();
