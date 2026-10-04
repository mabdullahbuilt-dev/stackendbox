// node scripts/shot-stage.mjs <sectionId> <selector> <w> <h> <outprefix> <ms,ms,...>  clip-screenshots a stage at given elapsed times after it scrolls into view
import { chromium } from "playwright-core";
const [id, sel, w, h, out, times = "300,2500,6000,11000"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
await p.evaluate(([id, sel]) => { const e = document.querySelector(`#${id} ${sel}`); scrollTo(0, scrollY + e.getBoundingClientRect().top - Math.max(70, (innerHeight - e.getBoundingClientRect().height) / 2)); }, [id, sel]);
let last = 0, i = 0;
for (const t of times.split(",").map(Number)) {
  await p.waitForTimeout(t - last); last = t;
  const box = await p.locator(`#${id} ${sel}`).boundingBox();
  await p.screenshot({ path: `${out}-${i++}.png`, clip: box, animations: "allow", caret: "initial" });
}
await b.close();
