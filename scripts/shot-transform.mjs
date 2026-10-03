// node scripts/shot-transform.mjs <w> <h> <outprefix> [tabIndex]  captures before / mid / after of the manual-to-automated stage
import { chromium } from "playwright-core";
const [w, h, out, tab = "0"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
await p.evaluate(() => { const e = document.querySelector("#transform .mt"); scrollTo(0, scrollY + e.getBoundingClientRect().top - 120); });
await p.waitForTimeout(600);
await p.locator("#transform [role=tab]").nth(+tab).click();
const box = await p.locator("#transform .mt").boundingBox();
const snap = (path) => p.screenshot({ path, clip: box, animations: "allow", caret: "initial" });
await p.waitForTimeout(150); await snap(`${out}-0before.png`);
await p.waitForTimeout(1050); await snap(`${out}-1mid.png`);
await p.waitForTimeout(1300); await snap(`${out}-2step.png`);
await p.waitForTimeout(3600); await snap(`${out}-3after.png`);
await b.close();
