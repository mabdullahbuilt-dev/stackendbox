// Lists elements extending past the viewport at a given width with optional 200% text. node scripts/overflow-find.mjs [w] [h] [zoomText]
import { chromium } from "playwright-core";
const [w = "390", h = "844", big = "1"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 })).newPage();
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
if (big === "1") await p.addStyleTag({ content: "html{font-size:200%!important}" });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const seen = new Map();
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(50);
  const o = await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !e.closest(".rail,.itab,.tf__tabs,.fit,.final__thumbs,.hero__stage,.ixw__stage"); }).slice(0, 40).map((e) => (e.closest("section")?.id || "?") + " " + e.tagName + "." + String(e.className).slice(0, 40) + " r=" + Math.round(e.getBoundingClientRect().right)); });
  o.forEach((x) => seen.set(x, 1)); }
console.log([...seen.keys()].slice(0, 25).join("\n") || "none");
await b.close();
