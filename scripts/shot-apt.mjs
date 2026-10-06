import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
for (const [id, f] of [["hero", 0.2], ["business", 0.12], ["integrations", 0.1], ["process", 0.15]]) {
  await p.evaluate(([id, f]) => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); scrollTo(0, scrollY + r.bottom - innerHeight * f); }, [id, f]);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/apt-${id}.png` });
}
await b.close();
