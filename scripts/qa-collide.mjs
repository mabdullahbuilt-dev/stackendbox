// Visual text-collision QA. Scrolls the page in half-viewport steps and, at each rest position, collects every
// visible text run and interactive control (after opacity and overflow clipping), then flags unrelated pairs whose
// boxes overlap. Usage: node scripts/qa-collide.mjs [WxH ...]   (default: the 10 QA viewports)
// Intentional overlaps are excluded by selector below, each with a reason. Everything else is a defect.
import { chromium, webkit } from "playwright-core";
const ENGINE = (process.argv.find((a) => a.startsWith("--engine=")) ?? "--engine=chromium").split("=")[1];

const VPS = (process.argv.slice(2).filter((a) => !a.startsWith("--")).length ? process.argv.slice(2).filter((a) => !a.startsWith("--")) : ["1440x900", "1366x768", "1280x800", "1024x768", "820x1180", "768x1024", "430x932", "390x844", "375x812", "360x800"]).map((s) => s.split("x").map(Number));
const URL = process.env.URL || "http://localhost:3100/";
// Intentional overlaps: decorative layered artwork whose parts are meant to stack.
const ALLOW = [
  ".nav", // fixed header: content scrolling beneath it is not a collision
  ".hero__canvas", ".hero__poster",
  ".skip", ".sr-only",
  ".v-w3__blocks", // Web3 service card: block-height ticker drawn deliberately behind the transaction card
  ".v-cu__plane", // Custom software card: engineering planes stacked on purpose (layered depth illustration)
];

// default (GPU-less) headless: text geometry does not need WebGL, and software GL slows frames enough to sample
// mid-transition
const b = ENGINE === "webkit" ? await webkit.launch() : await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let total = 0;
for (const [w, h] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 || ENGINE === "webkit", isMobile: w < 700 || ENGINE === "webkit" });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
  const found = new Map();
  for (let y = 0; y < H - h / 2; y += Math.round(h / 2)) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await p.waitForTimeout(1000); // let state transitions finish: only resting frames are judged
    const hits = await p.evaluate((ALLOW) => {
      const vw = innerWidth, vh = innerHeight;
      const allowed = (el) => ALLOW.some((s) => el.closest(s));
      const visible = (el) => {
        let o = 1;
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.display === "none" || cs.visibility === "hidden") return 0;
          o *= +cs.opacity;
        }
        return o;
      };
      const clip = (el, r) => {
        let { left, top, right, bottom } = r;
        for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") {
            const q = e.getBoundingClientRect();
            if (cs.overflowX !== "visible") { left = Math.max(left, q.left); right = Math.min(right, q.right); }
            if (cs.overflowY !== "visible") { top = Math.max(top, q.top); bottom = Math.min(bottom, q.bottom); }
          }
        }
        left = Math.max(left, 0); top = Math.max(top, 0); right = Math.min(right, vw); bottom = Math.min(bottom, vh);
        return right - left > 2 && bottom - top > 2 ? { left, top, right, bottom } : null;
      };
      const items = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || allowed(el) || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const r = rg.getBoundingClientRect();
        if (r.width < 3 || r.height < 3 || r.bottom < 0 || r.top > vh) continue;
        const o = visible(el); if (o < 0.35) continue;
        const c = clip(el, r); if (!c) continue;
        items.push({ el, r: c, t: n.textContent.trim().slice(0, 40) });
      }
      document.querySelectorAll("button, a, input, textarea, select").forEach((el) => {
        if (allowed(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 3 || r.height < 3 || r.bottom < 0 || r.top > vh) return;
        if (visible(el) < 0.35) return;
        const c = clip(el, r); if (!c) return;
        items.push({ el, r: c, t: `<${el.tagName.toLowerCase()}> ${(el.innerText || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 30)}` });
      });
      const unit = (el) => el.closest("h1, h2, h3, h4, button, a, label, li, .field, [data-unit]") || el;
      const desc = (el) => { const s = el.closest("section[id], footer"); return `${s ? (s.id || "footer") : "?"} ${el.tagName.toLowerCase()}.${(el.className && typeof el.className === "string" ? el.className.split(" ")[0] : "")}`; };
      const out = [];
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j];
        if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const ua = unit(A.el), ub = unit(B.el);
        if (ua === ub || ua.contains(ub) || ub.contains(ua)) continue;
        const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        const oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (ox <= 3 || oy <= 3) continue;
        const area = Math.min((A.r.right - A.r.left) * (A.r.bottom - A.r.top), (B.r.right - B.r.left) * (B.r.bottom - B.r.top));
        if ((ox * oy) / area < 0.12) continue;
        const sa = A.el.closest("section[id]")?.id, sb = B.el.closest("section[id]")?.id;
        out.push({ cross: sa !== sb, a: `${desc(A.el)} "${A.t}"`, b: `${desc(B.el)} "${B.t}"`, at: [Math.round(A.r.left), Math.round(A.r.top)] });
      }
      return out;
    }, ALLOW);
    for (const x of hits) { const k = x.a + "|" + x.b; if (!found.has(k)) found.set(k, { ...x, y }); }
  }
  const list = [...found.values()];
  total += list.length;
  console.log(`${list.length ? "FAIL" : "PASS"} ${w}x${h}: ${list.length} overlapping pairs (${list.filter((x) => x.cross).length} across sections)`);
  for (const x of list) console.log(`   ${x.cross ? "CROSS " : ""}y=${x.y} @${x.at}  ${x.a}  <>  ${x.b}`);
  await ctx.close();
}
await b.close();
console.log(total ? `TOTAL ${total}` : "ALL PASSED");
process.exit(total ? 1 : 0);
