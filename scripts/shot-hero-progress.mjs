// node scripts/shot-hero-progress.mjs <w> <h> <outprefix> [wait=ms]  hero at progress 0/.25/.5/.75/1 by jumping scroll (fast-jump safe check)
import { chromium } from "playwright-core";
const [w, h, out, wait = "2500"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3100", { waitUntil: "load" });
await p.waitForTimeout(+wait + 2500); // idle load of the 3D scene, with no interaction at all
console.log("canvas ready without interaction:", await p.locator(".hero__canvas[data-ready='true'] canvas").count());
const total = await p.evaluate(() => { const t = document.querySelector("[data-hero-track]"); return t.offsetHeight - innerHeight; });
for (const pr of [0, 0.25, 0.5, 0.75, 1]) {
  await p.evaluate((y) => scrollTo(0, y), Math.round(total * pr));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}-${Math.round(pr * 100)}.png` });
}
console.log("errors", errs);
await b.close();
