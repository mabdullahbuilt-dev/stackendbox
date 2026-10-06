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
  // Judge every section at rest: scroll it into place (its own hand-off transforms settle), then look for real
  // descendants that leave the viewport without an ancestor inside the section clipping them.
  const ids = await p.evaluate(() => [...document.querySelectorAll("main > section[id]")].map((s) => s.id));
  const out = [];
  for (const id of ids) {
    await p.evaluate((id) => { const e = document.getElementById(id); scrollTo({ top: scrollY + e.getBoundingClientRect().top, behavior: "instant" }); }, id);
    await p.waitForTimeout(id === "ai" ? 2600 : 380); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const bad = await p.evaluate((id) => {
      const W = document.documentElement.clientWidth, s = document.getElementById(id);
      const clipped = (e) => { const er = e.getBoundingClientRect(); for (let a = e.parentElement; a && a !== s; a = a.parentElement) { if (getComputedStyle(a).overflowX !== "visible") { const ar = a.getBoundingClientRect(); if (er.right > ar.right + 1 || er.left < ar.left - 1) return true; } } return false; };
      const shown = (e) => { for (let a = e; a && a !== s; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.opacity === "0" || cs.visibility === "hidden") return false; } return true; };
      // the honeypot field is intentionally off-screen and hidden from people
      return [...s.querySelectorAll(":scope > * *")].filter((e) => { if (e.closest(".hp")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && (r.right > W + 2 || r.left < -2) && getComputedStyle(e).position !== "fixed" && !clipped(e) && shown(e); }).slice(0, 2).map((e) => String(e.className.baseVal ?? e.className).slice(0, 30));
    }, id);
    if (bad.length) out.push(`${id}:${bad.join("|")}`);
  }
  const r = { over: await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), out };
  const ok = r.over <= 0 && r.out.length === 0; if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", `${w}x${h}`, JSON.stringify(r));
  await p.context().close();
}
await b.close(); process.exit(bad ? 1 : 0);
