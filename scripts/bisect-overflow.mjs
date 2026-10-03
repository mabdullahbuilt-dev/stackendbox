import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.25 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{font-size:200%!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
console.log(await p.evaluate(() => {
  const base = document.documentElement.scrollWidth - document.documentElement.clientWidth; const out = [`base ${base}`];
  for (const s of document.querySelectorAll("main > section, main > div, footer, header")) { const d = s.style.display; s.style.display = "none"; const w = document.documentElement.scrollWidth - document.documentElement.clientWidth; s.style.display = d; if (w !== base) out.push((s.id || s.className) + " -> " + w); }
  return out.join("\n");
}));
console.log(await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll("#delivery *")].filter((e) => e.getBoundingClientRect().right > vw).map((e) => e.tagName + "." + String(e.className.baseVal ?? e.className).slice(0, 30) + " " + Math.round(e.getBoundingClientRect().right) + " w=" + Math.round(e.getBoundingClientRect().width)).join("\n"); }));
await b.close();
