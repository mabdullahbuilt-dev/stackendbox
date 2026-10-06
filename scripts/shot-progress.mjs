// node scripts/shot-progress.mjs <sectionId> <stageSel> <outPrefix> <n> [w] [h]  : screenshots of the stage at n scroll progress points through a pinned section
import { chromium } from "playwright-core";
const [id, stage, out, n = "6", w = "1440", h = "900"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
for (let i = 0; i < +n; i++) {
  const f = (i + 0.5) / +n;
  await p.evaluate(([id, f]) => { const e = document.getElementById(id); const top = scrollY + e.getBoundingClientRect().top; scrollTo(0, top + (e.offsetHeight - innerHeight) * f); }, [id, f]);
  await p.waitForTimeout(900);
  if (stage === "VIEWPORT") await p.screenshot({ path: `${out}-${i}.png` }); else await p.locator(stage).screenshot({ path: `${out}-${i}.png` });
}
await b.close();
