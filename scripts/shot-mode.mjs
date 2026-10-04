// node scripts/shot-mode.mjs <tabIndex> <out> <w> <h> <ms,ms,..>  Specialized chapter, click a mode then capture the stage at times
import { chromium } from "playwright-core";
const [tab, out, w = "1440", h = "900", times = "800,3500,9500"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate(() => { const e = document.querySelector("#specialized .spc__stage"); scrollTo(0, scrollY + e.getBoundingClientRect().top - Math.max(70, (innerHeight - e.getBoundingClientRect().height) / 2)); });
await p.waitForTimeout(400);
await p.locator("#specialized [role=tab]").nth(+tab).click();
let last = 0, i = 0;
for (const t of times.split(",").map(Number)) { await p.waitForTimeout(t - last); last = t; const box = await p.locator("#specialized .spc__stage").boundingBox(); await p.screenshot({ path: `${out}-${i++}.png`, clip: box, animations: "allow" }); }
await b.close();
