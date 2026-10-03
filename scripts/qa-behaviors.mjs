// Behaviour QA for the redesigned homepage. node scripts/qa-behaviors.mjs [url]
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const open = async (ctxOpts, goto = true) => { const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(e.message)); if (goto) await p.goto(url, { waitUntil: "networkidle" }); await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" }); return { p, errs, ctx }; };
const noX = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// --- desktop, full motion
{
  const { p, errs } = await open({ viewport: { width: 1440, height: 900 } });
  ok((await p.locator("h1").count()) === 1, "single h1");
  ok((await p.locator("h1").innerText()).replace(/\s+/g, " ").trim() === "Build the product. Automate the work. Connect the stack.", "h1 text correct");
  ok((await p.locator(".hero__canvas canvas").count()) === 0, "hero WebGL waits for first interaction");
  await p.mouse.move(600, 400); await p.mouse.move(640, 420);
  await p.waitForTimeout(3500);
  ok((await p.locator(".hero__canvas[data-ready='true'] canvas").count()) === 1, "hero WebGL canvas mounted");
  ok((await p.locator("#testimonials").count()) === 0, "testimonials hidden (no verified entries)");
  ok((await p.locator("a[href='#']").count()) === 0, "no dead # links");
  const html = await p.content();
  ok(!html.includes("—"), "no em dash in rendered HTML");
  // tablists: arrow keys
  for (const [sel, label] of [["#intent [role=tablist]", "intent"], ["#transform [role=tablist]", "transform"], ["#labs [role=tablist]", "labs"], ["#process [role=tablist]", "process"]]) {
    await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
    await p.waitForTimeout(400);
    const first = p.locator(`${sel} [role=tab][aria-selected=true]`);
    await first.focus();
    const before = await first.innerText();
    await p.keyboard.press("ArrowRight");
    const after = await p.locator(`${sel} [role=tab][aria-selected=true]`).innerText();
    ok(before !== after, `${label} tablist responds to ArrowRight`);
  }
  // service CTA preselects builder
  await p.evaluate(() => document.querySelector("#services").scrollIntoView());
  await p.getByRole("link", { name: /Automate a Workflow/ }).first().click();
  await p.waitForTimeout(900);
  ok((await p.locator("#start .choice[data-checked='true']").allInnerTexts()).join("|").includes("Automation"), "service CTA preselects Automation in builder");
  // rescue CTA preselects stage
  await p.evaluate(() => document.querySelector("#rescue").scrollIntoView());
  await p.getByRole("link", { name: "Improve an Existing Product" }).click();
  await p.waitForTimeout(1200);
  await p.getByRole("button", { name: "Continue" }).click();
  await p.waitForTimeout(900);
  ok((await p.locator("#start .choice[data-checked='true']").allInnerTexts()).join("|").includes("Existing Product"), "rescue CTA preselects Existing Product stage");
  ok(errs.length === 0, "no console errors " + errs.join("|").slice(0, 200));
}
// --- keyboard only: tab through the whole page, no trap
{
  const { p } = await open({ viewport: { width: 1280, height: 800 } });
  let reachedFooter = false, count = 0, lastVisible = 0;
  for (let i = 0; i < 400; i++) {
    await p.keyboard.press("Tab"); count++;
    const info = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { footer: !!a.closest("footer"), inView: r.bottom > 0 && r.top < innerHeight, outline: cs.outlineStyle !== "none" || cs.boxShadow !== "none" }; });
    if (info?.footer) { reachedFooter = true; break; }
    if (info?.inView) lastVisible++;
  }
  ok(reachedFooter, `keyboard reaches footer in ${count} tabs`);
  ok(lastVisible > count * 0.8, "focused elements stay scrolled into view");
}
// --- reduced motion (OS)
{
  const { p, errs } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await p.waitForTimeout(2500);
  ok((await p.locator(".hero__canvas canvas").count()) === 0, "reduced motion: no WebGL canvas");
  ok((await p.evaluate(() => document.documentElement.dataset.motion)) === "reduced", "reduced motion flag set");
  await p.evaluate(() => document.querySelector("#transform").scrollIntoView());
  await p.waitForTimeout(600);
  ok((await p.locator("#transform .tf__stage").getAttribute("data-state")) === "after", "reduced motion: transformation shows final state");
  ok(errs.length === 0, "reduced motion: no console errors");
}
// --- manual motion switch
{
  const { p } = await open({ viewport: { width: 1440, height: 900 } });
  const btn = p.locator("label.switch").first();
  if (await btn.count()) { await btn.click(); await p.waitForTimeout(400); ok((await p.evaluate(() => document.documentElement.dataset.motion)) === "reduced", "manual Reduce Motion switch applies"); } else ok(false, "motion toggle present");
}
// --- 125% zoom equivalent (viewport 1152x720 at DPR1.25) and 200% text zoom
for (const [w, h, label] of [[1152, 720, "125% zoom desktop"], [1100, 700, "narrow laptop"], [390, 844, "mobile"]]) {
  const { p } = await open({ viewport: { width: w, height: h }, deviceScaleFactor: 1.25 });
  await p.addStyleTag({ content: "html{font-size:200%!important}" }).catch(() => {});
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  let worst = 0; for (let y = 0; y < total; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(30); worst = Math.max(worst, await noX(p)); }
  ok(worst <= 1, `${label} with 200% text: no horizontal overflow (${worst}px)`);
}
// --- mobile menu
{
  const { p } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.getByRole("button", { name: "Menu" }).click();
  await p.waitForTimeout(500);
  ok(await p.getByRole("dialog").count() > 0, "mobile menu opens");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok((await p.getByRole("dialog").count()) === 0, "mobile menu closes on Escape");
  // touch targets
  const small = await p.evaluate(() => [...document.querySelectorAll("a[href],button,[role=tab]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40) && getComputedStyle(e).visibility !== "hidden" && !e.closest(".sr-only") && !e.classList.contains("skip-link"); }).map((e) => (e.textContent || e.ariaLabel || "").trim().slice(0, 24) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)).slice(0, 12));
  console.log("INFO small targets (<40px):", JSON.stringify(small));
}
await b.close();
