// node scripts/sections.mjs <w> <h> <outdir> [url]
import { chromium } from "playwright-core";
import fs from "node:fs";
const [w = "1440", h = "900", out, url = "http://localhost:3100"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 });
const p = await ctx.newPage();
const errs = [];
p.on("console", (m) => ["error"].includes(m.type()) && errs.push(m.text()));
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto(url, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.waitForTimeout(1500);
const ids = ["services","intent","transform","labs","product","founders","ai","integrations","work","depth","process","delivery","start","final"];
// slow scroll through page first so observers fire
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 600) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(500);
for (const id of ids) {
  await p.evaluate((id) => { const e = document.getElementById(id); if (e) { const r = e.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top); } }, id);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}/${id}.png` });
}
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/footer.png` });
console.log("errors:", errs.length ? errs.join("\n") : "none");
console.log("overflow:", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "docHeight:", total);
await b.close();
