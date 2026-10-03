// node scripts/shot-el.mjs <url> <out.png> <selector> [w] [h] [click selector...]
import { chromium } from "playwright-core";
const [url, out, sel, w = "1440", h = "900", ...clicks] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto(url, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start", behavior: "instant" }), sel);
await p.waitForTimeout(1200);
for (const c of clicks) { await p.click(c); await p.waitForTimeout(1800); }
await p.screenshot({ path: out });
console.log(errs.join("\n") || "no errors");
console.log("overflow:", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await b.close();
