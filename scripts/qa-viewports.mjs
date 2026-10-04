// Overflow assertions at the 10 required viewports.
import { chromium } from "playwright-core";
const VPS = [[1440,900],[1366,768],[1280,800],[1024,768],[820,1180],[768,1024],[430,932],[390,844],[375,812],[360,800]];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
let bad = 0;
for (const [w,h] of VPS) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const out = [...document.querySelectorAll("main section")].filter((s) => s.scrollWidth > W + 1).map((s) => s.id);
    return { over: document.documentElement.scrollWidth - W, out };
  });
  const ok = r.over <= 0 && r.out.length === 0; if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", `${w}x${h}`, JSON.stringify(r));
  await p.context().close();
}
await b.close(); process.exit(bad ? 1 : 0);
