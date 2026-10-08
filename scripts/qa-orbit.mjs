// AI orbit touch-target overlap sampler. node scripts/qa-orbit.mjs [--engine=chromium|webkit] [--samples=N] [WxH ...]
// Samples the six AI module pills' effective tap areas (layout box + vertical ::before extension) repeatedly and fails on any overlap.
import { chromium, webkit } from "playwright-core";
const args = process.argv.slice(2);
const ENGINE = (args.find((a) => a.startsWith("--engine=")) || "--engine=chromium").split("=")[1];
const SAMPLES = +((args.find((a) => a.startsWith("--samples=")) || "--samples=60").split("=")[1]);
const sizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split("x").map(Number));
const SIZES = sizes.length ? sizes : [[390, 844], [430, 932], [768, 1024], [834, 1194], [1024, 1366], [1024, 768], [1366, 1024]];
const URL = process.env.URL || "http://localhost:3100/";
const b = await ({ chromium, webkit }[ENGINE]).launch(ENGINE === "chromium" ? { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" } : {});
let bad = 0;
for (const [w, h] of SIZES) {
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto(URL, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const e = document.querySelector("#ai"); scrollTo(0, e.getBoundingClientRect().top + scrollY + 120); });
  await p.waitForTimeout(1500);
  let over = 0, worst = "", vis = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const r = await p.evaluate(() => {
      const els = [...document.querySelectorAll(".aorb__sat")].map((e) => {
        const r = e.getBoundingClientRect(), pb = parseFloat(getComputedStyle(e, "::before").height) || r.height, ext = Math.max(0, (pb - r.height) / 2);
        return { l: e.getAttribute("aria-label").slice(0, 20), x0: r.left, x1: r.right, y0: r.top - ext, y1: r.bottom + ext, w: r.width };
      });
      const o = [];
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        const a = els[i], c = els[j], ow = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oh = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ow > 0.5 && oh > 0.5) o.push(`${a.l} <> ${c.l} ${Math.round(ow)}x${Math.round(oh)}`);
      }
      return { o, n: els.length, inView: els.every((e) => e.x0 >= 0 && e.x1 <= innerWidth) };
    });
    if (r.n !== 6 || !r.inView) { over++; worst = `n=${r.n} inView=${r.inView}`; }
    if (r.o.length) { over++; worst = r.o[0]; }
    await p.waitForTimeout(400);
  }
  console.log(`${over ? "FAIL" : "PASS"} ${ENGINE} ${w}x${h}: ${SAMPLES} samples, ${over} bad${worst ? " (" + worst + ")" : ""}`);
  bad += over; await c.close();
}
await b.close();
console.log(bad ? `FAILED ${bad}` : "ALL PASSED");
process.exit(bad ? 1 : 0);
