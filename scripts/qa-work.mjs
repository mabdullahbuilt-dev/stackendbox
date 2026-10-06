// Selected Work behaviour: auto advance, pause on hover/focus/pause control, keys, buttons, tabs, drag, full-size viewer,
// reduced motion, re-entry reset, and no timer growth. node scripts/qa-work.mjs
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://localhost:3100/";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let fails = 0; const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails++; };
const open = async (opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); }
  return { ctx, p };
};
const idx = (p) => p.evaluate(() => [...document.querySelectorAll("#work .shw__tab")].findIndex((t) => t.getAttribute("aria-current") === "true"));
const goto = (p) => p.evaluate(() => { const e = document.querySelector("#work .shw"); scrollTo(0, scrollY + e.getBoundingClientRect().top - 140); });
{
  const { ctx, p } = await open();
  await goto(p); await p.mouse.move(5, 5); await p.waitForTimeout(1200);
  const a = await idx(p); await p.waitForTimeout(7200); const c = await idx(p);
  ok(a === 0 && c === 1, `auto advance while visible (${a} -> ${c})`);
  await p.mouse.move(683, 400); const h0 = await idx(p); await p.waitForTimeout(7500); ok((await idx(p)) === h0, "hover pauses");
  await p.mouse.move(5, 5);
  await p.keyboard.press("Tab"); // focus enters the carousel region children
  await p.locator("#work .shw__btn").nth(1).focus(); await p.waitForTimeout(300);
  const f0 = await idx(p); await p.waitForTimeout(7500); ok((await idx(p)) === f0, "focus pauses");
  await p.locator("#work .shw__btn").nth(1).click(); await p.mouse.move(5, 5); ok((await idx(p)) === (f0 + 1) % 5, "next button");
  await p.locator("#work .shw__btn").nth(0).click(); ok((await idx(p)) === f0, "previous button");
  await p.locator("#work .shw__tab").nth(3).click(); ok((await idx(p)) === 3, "navigator tab selects");
  await p.locator("#work .shw__btn").nth(1).focus(); await p.keyboard.press("ArrowRight"); ok((await idx(p)) === 4, "ArrowRight");
  await p.keyboard.press("ArrowRight"); ok((await idx(p)) === 0, "wraps to first");
  await p.keyboard.press("ArrowLeft"); ok((await idx(p)) === 4, "ArrowLeft");
  // pause control stops auto movement even without hover or focus
  await p.locator("#work .shw__btn").nth(2).click(); await p.mouse.move(5, 5); await p.evaluate(() => document.activeElement.blur());
  const q0 = await idx(p); await p.waitForTimeout(7500); ok((await idx(p)) === q0, "pause control stops movement");
  await p.locator("#work .shw__btn").nth(2).click();
  // drag
  const box = await p.locator("#work .shw__view").boundingBox();
  const d0 = await idx(p);
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4, { steps: 8 }); await p.mouse.up();
  ok((await idx(p)) === (d0 + 1) % 5, "drag left advances");
  // full size viewer
  await p.locator("#work .shw__zoom").click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector("#work .shw__dlg").open), "full-size viewer opens");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.querySelector("#work .shw__dlg").open)), "Escape closes the viewer");
  // slides off-screen are inert; only the active title is exposed
  ok(await p.evaluate(() => document.querySelectorAll("#work .shw__slide[inert]").length === 4), "inactive slides are inert");
  // re-entry resets to the first project
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800); await goto(p); await p.mouse.move(5, 5); await p.waitForTimeout(1500);
  ok((await idx(p)) === 0, "re-entry starts from the first project");
  // timers do not accumulate: leave and return three times, then measure advance cadence
  for (let k = 0; k < 3; k++) { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500); await goto(p); await p.waitForTimeout(500); }
  await p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur()); await p.mouse.move(5, 5); await p.waitForTimeout(1200); const s0 = await idx(p); await p.waitForTimeout(13500); const s1 = await idx(p);
  ok(((s1 - s0 + 5) % 5) <= 3, `cadence stays one step per interval after 3 re-entries (${s0} -> ${s1})`);
  await ctx.close();
}
{
  const { ctx, p } = await open({ reduced: true });
  await goto(p); await p.mouse.move(5, 5); await p.waitForTimeout(1200); const a = await idx(p); await p.waitForTimeout(8000);
  ok((await idx(p)) === a, "reduced motion: no automatic movement");
  ok((await p.locator("#work .shw__btn").count()) === 2, "reduced motion: no pause control needed");
  await p.locator("#work .shw__btn").nth(1).click(); ok((await idx(p)) === 1, "reduced motion: manual control still works");
  await ctx.close();
}
await b.close(); console.log(fails ? `FAILED ${fails}` : "ALL PASSED"); process.exit(fails ? 1 : 0);
