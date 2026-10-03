// node scripts/scene-shots.mjs <selector> <pinFactor> <out-prefix> <w> <h> <p1,p2,...>
import { chromium } from "playwright-core";
const [sel, pinF, out, w = "1440", h = "900", ps = "0.1,0.3,0.5,0.7,0.95"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.waitForTimeout(1500);
// scroll to just above the section to let ScrollTrigger compute, then measure the pin start
await p.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "instant", block: "start" }), sel);
await p.waitForTimeout(500);
const start = await p.evaluate(() => window.scrollY);
for (const pr of ps.split(",").map(Number)) {
  await p.evaluate((y) => window.scrollTo(0, y), start + pr * +pinF * +h);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}-${pr}.png` });
}
console.log(errs.join("\n") || "no errors");
console.log("overflow:", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await b.close();
