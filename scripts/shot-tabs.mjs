// node scripts/shot-tabs.mjs <section-selector> <w> <h> <outprefix> [stageSelector]  screenshots each tab of a tablist
import { chromium } from "playwright-core";
const [sec, w, h, out, stage] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, scrollY + e.getBoundingClientRect().top - 80); }, sec);
await p.waitForTimeout(800);
const tabs = p.locator(`${sec} [role=tab]`);
const n = await tabs.count();
for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await p.waitForTimeout(+(process.env.WAIT ?? 1900)); await (stage ? p.locator(stage).first() : p.locator(sec)).screenshot({ path: `${out}-${i}.png` }); }
await b.close();
