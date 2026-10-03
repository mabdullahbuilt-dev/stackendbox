// Overflow / console / axe across viewports. node scripts/qa-matrix.mjs [url]
import { chromium } from "playwright-core";
import fs from "node:fs";
const url = process.argv[2] ?? "http://localhost:3100";
const axeSrc = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844], [360, 740]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  let maxOverflow = 0;
  for (let y = 0; y < total; y += 500) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(40);
    maxOverflow = Math.max(maxOverflow, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  // elements wider than the viewport (excluding intentionally clipped rails/carousels)
  const wide = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth; const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 2 || r.left < -2) && !el.closest(".dcar, .rail, .hero__stage, .ix, .xstage, .final__thumbs, .ui__stage, .mstage, .ipsec__stage, .explorer__list, .fit, .sheet, .skip-link, .ghost, .final__ghost, .bstrip, .work, .proof, .nav")) out.push(el.className?.toString().slice(0, 40) || el.tagName);
    }
    return [...new Set(out)].slice(0, 6);
  });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(axeSrc);
  const ax = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }); return r.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`); });
  console.log(`${w}x${h} overflow=${maxOverflow} wide=${JSON.stringify(wide)} consoleErrors=${errs.length} axe=${ax.length ? "\n  " + ax.join("\n  ") : "clean"}`);
  await ctx.close();
}
await b.close();
