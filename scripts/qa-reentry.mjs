// Re-entry matrix: for every animated chapter, check VISUAL state (computed transform/opacity/text/selection), not only
// data attributes, through: entry down, exit below, re-enter up (reverse), exit above, second forward pass, refresh
// inside the section, resize mid-scene, tab hidden/visible, reduced motion. Time-driven chapters (AI, Specialized,
// Built to work, Shipped products) are checked for staying alive while visible and resuming after re-entry.
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://localhost:3100/";
const [W, H] = (process.argv[2] || "1440x900").split("x").map(Number);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let fails = 0; const rows = [];
const mark = (ch, test, ok, info = "") => { rows.push([ch, test, ok ? "PASS" : "FAIL", info]); if (!ok) fails++; };

// signature = what a visitor sees, read from rendered styles
const SIG = {
  hero: `(() => { const v = document.querySelector("#hero .hero__visual"); return v.dataset.sep + "|" + getComputedStyle(document.querySelector("#hero .hero__cap")).opacity; })()`,
  product: `(() => { const e = document.querySelector("#product .ipv-brief"); const cs = getComputedStyle(e); return cs.translate + "|" + cs.scale + "|" + document.querySelector("#product").dataset.s; })()`,
  business: `(() => [...document.querySelectorAll("#business .ops__stories li")].map((l) => getComputedStyle(l).borderColor).join(",") + "|" + [...document.querySelectorAll("#business .ops__state")].map((e) => getComputedStyle(e).opacity).join(","))()`,
  transform: `(() => [...document.querySelectorAll("#transform .mt-ghost")].slice(0, 3).map((e) => getComputedStyle(e).transform + getComputedStyle(e).translate).join("|"))()`,
  integrations: `(() => [...document.querySelectorAll("#integrations .ixops__r")].map((e) => getComputedStyle(e.querySelector("i") || e).color).join(","))()`,
  rescue: `(() => [...document.querySelectorAll("#rescue .rx-checks li b")].map((e) => e.textContent).join(","))()`,
  depth: `(() => (document.querySelector("#depth .xr__ins b")?.textContent || "complete") + "|" + getComputedStyle(document.querySelector("#depth .xr__live")).opacity)()`,
  process: `(() => document.querySelector("#process .wb__space")?.textContent.slice(0, 40) + "|" + getComputedStyle(document.querySelector("#process .wb__rule"), "::after").width)()`,
  delivery: `(() => getComputedStyle(document.querySelector("#delivery .why__obj")).translate + "|" + document.querySelector("#delivery .why__obj b").textContent)()`,
};
const TIME = {
  ai: `(() => [...document.querySelectorAll("#ai .aorb__sat")].map((e) => e.style.getPropertyValue("--tx")).join(","))()`,
  specialized: `(() => document.querySelector("#specialized .spc__stage").dataset.mode + "|" + document.querySelector("#specialized .spc__scene").textContent.length)()`,
  proof: `(() => document.querySelector("#proof .proof__tab[data-active=true] b")?.textContent + "|" + document.querySelector("#proof .proof__screen")?.textContent.length)()`,
  work: `(() => { const t = document.querySelector("#work .shw__track, .shw__track"); return t ? getComputedStyle(t).transform + "|" + (document.querySelector(".shw [aria-current=true], .shw__thumb[data-active=true]")?.textContent || "") : "none"; })()`,
};

const page = async (opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 800) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  return { ctx, p };
};
const range = (p, id) => p.evaluate((id) => { const e = document.getElementById(id); const top = scrollY + e.getBoundingClientRect().top; const h = e.offsetHeight; return id === "hero" ? [0, Math.max(1, h - innerHeight)] : e.dataset.scroll === "pin" ? [top, Math.max(1, h - innerHeight)] : [top - innerHeight * 0.55, h + innerHeight * 0.1]; }, id);
const at = async (p, id, q, wait = 1400) => { const [a, r] = await range(p, id); await p.evaluate((y) => scrollTo(0, y), Math.round(a + r * q)); await p.waitForTimeout(wait); return p.evaluate(SIG[id]); };
const far = async (p, where) => { await p.evaluate((w) => scrollTo(0, w === "below" ? document.documentElement.scrollHeight : 0), where); await p.waitForTimeout(700); };

{ // scroll-narrative chapters
  const { ctx, p } = await page();
  for (const id of Object.keys(SIG).filter((k) => !process.env.ONLY || process.env.ONLY.split(",").includes(k))) {
    const Q = id === "hero" ? [0.3, 0.55, 0.98] : [0.12, 0.5, 0.9];
    const f1 = await at(p, id, Q[0]), f2 = await at(p, id, Q[1]), f3 = await at(p, id, Q[2]);
    mark(id, "entry down: visual state progresses", f1 !== f3 || f1 !== f2, `${f1.slice(0, 40)} -> ${f3.slice(0, 40)}`);
    await far(p, "below");
    const u3 = await at(p, id, Q[2]), u1 = await at(p, id, Q[0]);
    mark(id, "re-enter up: reverses to the early state", u1 === f1, u1 === f1 ? "" : `${u1.slice(0, 50)} vs ${f1.slice(0, 50)}`);
    mark(id, "re-enter up: late state matches forward", u3 === f3, u3 === f3 ? "" : `${u3.slice(0, 50)} vs ${f3.slice(0, 50)}`);
    await far(p, "above");
    const s1 = await at(p, id, Q[0]), s2 = await at(p, id, Q[1]);
    mark(id, "second forward pass replays", s1 === f1 && s2 === f2, s1 === f1 && s2 === f2 ? "" : `${s1.slice(0, 40)} vs ${f1.slice(0, 40)} / ${s2.slice(0, 40)} vs ${f2.slice(0, 40)}`);
    // resize mid-scene and back
    await p.setViewportSize({ width: Math.round(W * 0.8), height: H }); await p.waitForTimeout(500);
    await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(500);
    const r2 = await at(p, id, Q[1]);
    mark(id, "resize mid-scene keeps the state", r2 === f2, r2 === f2 ? "" : `${r2.slice(0, 50)} vs ${f2.slice(0, 50)}`);
    // tab hidden/visible
    await p.evaluate(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await p.waitForTimeout(600);
    const t2 = await p.evaluate(SIG[id]);
    mark(id, "tab hidden/visible keeps the state", t2 === f2, t2 === f2 ? "" : `${t2.slice(0, 50)} vs ${f2.slice(0, 50)}`);
    // refresh inside the section
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1400);
    const rf = await p.evaluate(SIG[id]);
    mark(id, "refresh inside the section renders that position", rf === f2, rf === f2 ? "" : `${rf.slice(0, 50)} vs ${f2.slice(0, 50)}`);
    await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    // a fresh load only knows placeholder heights for off-screen (content-visibility) chapters: render them again so
    // the next chapter's measured position is real
    const tot = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < tot; y += 800) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
  }
  // time-driven chapters stay alive while visible and resume after re-entry
  for (const id of Object.keys(TIME).filter((k) => !process.env.ONLY || process.env.ONLY.split(",").includes(k))) {
    const go = async () => { await p.evaluate((id) => { const e = document.getElementById(id) || document.querySelector(".shw")?.closest("section") ; const t = document.getElementById(id) ? e : document.querySelector(".shw"); scrollTo(0, scrollY + t.getBoundingClientRect().top - 80); }, id); };
    await go(); await p.waitForTimeout(1500);
    const a = await p.evaluate(TIME[id]); await p.waitForTimeout(id === "ai" ? 1500 : 7500); const c = await p.evaluate(TIME[id]);
    mark(id, "alive while visible", a !== c, `${a.slice(0, 30)} -> ${c.slice(0, 30)}`);
    await far(p, "above"); await far(p, "below"); await go(); await p.waitForTimeout(1500);
    const d = await p.evaluate(TIME[id]); await p.waitForTimeout(id === "ai" ? 1500 : 7500); const e = await p.evaluate(TIME[id]);
    mark(id, "alive again after re-entry", d !== e, `${d.slice(0, 30)} -> ${e.slice(0, 30)}`);
  }
  await ctx.close();
}
{ // reduced motion: narrative chapters render a resolved final state, nothing loops
  const { ctx, p } = await page({ reduced: true });
  for (const id of ["product", "business", "transform", "process", "rescue"]) {
    const x = await at(p, id, 0.12), y = await at(p, id, 0.9);
    mark(id, "reduced motion: resolved state (no scroll progression)", x === y, x === y ? "" : `${x.slice(0, 40)} vs ${y.slice(0, 40)}`);
  }
  await ctx.close();
}
await b.close();
const wid = Math.max(...rows.map((r) => r[1].length));
for (const r of rows) console.log(`${r[2]} ${r[0].padEnd(13)} ${r[1].padEnd(wid)} ${r[3]}`);
console.log(fails ? `FAILED ${fails}` : `ALL PASSED (${rows.length})`);
process.exit(fails ? 1 : 0);
