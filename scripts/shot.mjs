// QA helper: node scripts/shot.mjs <url> <out.png> [width] [height] [scrollY] [fullPage]
import { chromium } from "playwright-core";
const [url, out, w = "1440", h = "900", sy = "0", full = ""] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on("console", (m) => ["error", "warning"].includes(m.type()) && errs.push(m.type() + ": " + m.text()));
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
if (+sy) { await p.evaluate((y) => window.scrollTo(0, y), +sy); await p.waitForTimeout(1500); }
await p.screenshot({ path: out, fullPage: !!full });
console.log(errs.join("\n") || "no console errors");
const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log("horizontal overflow px:", ov);
await b.close();
