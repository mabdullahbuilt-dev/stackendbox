// Selected Work evidence: node scripts/shot-work.mjs <outdir> [vp ...]  (rest frame plus slides 2 and 4)
import { chromium } from "playwright-core";
import fs from "node:fs";
const [out, ...vps] = process.argv.slice(2);
const list = vps.length ? vps : ["1440x900", "1366x768", "1280x800", "1024x768", "820x1180", "768x1024", "430x932", "390x844", "375x812", "360x800"];
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const v of list) {
  const [w, h] = v.split("x").map(Number);
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
  const go = async () => { await p.evaluate(() => { const e = document.querySelector("#work .shw"); scrollTo(0, scrollY + e.getBoundingClientRect().top - Math.max(70, innerHeight * 0.18)); }); await p.waitForTimeout(1600); };
  await go();
  // hold still so the carousel does not advance mid-capture
  await p.mouse.move(Math.round(w / 2), Math.round(h / 2));
  await p.screenshot({ path: `${out}/${v}-1.png` });
  const thumbs = p.locator("#work .shw__tab");
  for (const k of [1, 3]) { await thumbs.nth(k).click(); await p.mouse.move(Math.round(w / 2), Math.round(h / 2)); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${v}-${k + 1}.png` }); }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(v, "overflow", ov);
  await p.close();
}
await b.close();
