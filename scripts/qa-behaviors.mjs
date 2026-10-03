import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };

// ---- full motion desktop
{
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  ok((await p.locator("h1").count()) === 1, "single h1");
  ok((await p.locator("h1").innerText()).replace(/\s+/g, " ") === "Software. AI. Automation. Built end to end.", "h1 text correct and SSR-visible");
  await p.waitForTimeout(3500);
  ok((await p.locator(".hero__canvas[data-ready='true'] canvas").count()) === 1, "hero WebGL canvas mounted");
  // module list keyboard
  await p.focus(".module-list button");
  await p.keyboard.press("ArrowDown");
  ok((await p.evaluate(() => document.activeElement?.textContent?.includes("API"))) === true, "hero module list arrow-key navigation");
  // Explorer keyboard + selection sync
  await p.evaluate(() => document.getElementById("explorer").scrollIntoView());
  await p.waitForTimeout(800);
  await p.focus("#xt-product");
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(400);
  ok((await p.getAttribute("#xt-ai", "aria-selected")) === "true", "Explorer ArrowDown selects next tab");
  await p.keyboard.press("End"); await p.waitForTimeout(400);
  ok((await p.getAttribute("#xt-else", "aria-selected")) === "true", "Explorer End selects last tab");
  // scroll-driven selection: scroll within pin
  const pinTop = await p.evaluate(() => window.scrollY);
  await p.waitForTimeout(1700);
  await p.evaluate((y) => window.scrollTo(0, y), pinTop + 0.55 * 900 * 1.75);
  await p.waitForTimeout(1200);
  const sel = await p.evaluate(() => document.querySelector('#explorer [role=tab][aria-selected=true]')?.id);
  console.log("INFO scroll-driven explorer selection after ~55% of pin:", sel);
  // carousel keyboard
  await p.evaluate(() => document.querySelector(".dcar").scrollIntoView({ block: "center" }));
  await p.waitForTimeout(600);
  await p.focus(".dcar__track");
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500);
  ok((await p.locator('.dcard[data-active="true"]').getAttribute("aria-label")).startsWith("TablePilot"), "Carousel ArrowRight → TablePilot");
  ok((await p.locator(".dcard[aria-hidden='true']").count()) >= 1 && (await p.locator('.dcard[aria-hidden="false"]').count()) === 1, "only active slide exposed to AT");
  // nav: compress and anchors
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(500);
  ok((await p.getAttribute(".nav", "data-compact")) === "true", "nav compresses after scroll");
  const nb = await p.locator(".nav__bar").boundingBox();
  ok(Math.round(nb.height) === 56, `compact nav height = ${Math.round(nb.height)}`);
  // deep link anchors exist
  for (const id of ["explorer", "proof", "manual", "product", "integrations", "work", "depth", "breadth", "start", "process", "trust", "final"]) if (!(await p.locator("#" + id).count())) ok(false, "missing anchor #" + id);
  // links: no dead hrefs
  const bad = await p.evaluate(() => [...document.querySelectorAll("a")].filter((a) => { const h = a.getAttribute("href"); return !h || h === "#" || h.startsWith("javascript"); }).map((a) => a.outerHTML.slice(0, 80)));
  ok(bad.length === 0, "no dead href='#' / empty links " + JSON.stringify(bad));
  ok(errs.length === 0, "no console errors " + errs.join("|"));
  await p.close();
}
// ---- reduced motion
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  ok((await p.locator("canvas").count()) === 0, "reduced-motion: no WebGL canvas");
  ok((await p.locator(".module-list--static").count()) === 1, "reduced-motion: static module list visible");
  const pins = await p.evaluate(() => document.querySelectorAll(".pin-spacer").length);
  ok(pins === 0, `reduced-motion: no pinned scenes (pin-spacers=${pins})`);
  await p.evaluate(() => document.getElementById("manual").scrollIntoView()); await p.waitForTimeout(800);
  ok((await p.locator(".mcollage").count()) === 1 && (await p.locator(".mphases li").count()) === 5, "reduced-motion: Manual→Automated static before/after + 5 captions");
  await p.evaluate(() => document.getElementById("product").scrollIntoView()); await p.waitForTimeout(800);
  ok((await p.locator(".ipframe").count()) === 3, "reduced-motion: Idea→Product three static frames");
  await p.evaluate(() => document.getElementById("process").scrollIntoView()); await p.waitForTimeout(500);
  ok((await p.locator("ol.proc__static > li").count()) === 5, "reduced-motion: Process stacked list");
  ok(await p.evaluate(() => document.documentElement.dataset.motion === "reduced"), "html[data-motion=reduced]");
  ok(errs.length === 0, "no console errors " + errs.join("|"));
  await ctx.close();
}
// ---- manual toggle
{
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(() => document.querySelector("footer").scrollIntoView()); await p.waitForTimeout(400);
  await p.locator(".switch").click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.dataset.motion === "reduced"), "footer switch sets reduced motion");
  ok((await p.evaluate(() => localStorage.getItem("seb_motion"))) === "reduced", "preference persisted");
  await p.close();
}
// ---- mobile: menu, sheet focus, touch targets
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.click(".nav__menu-btn"); await p.waitForTimeout(500);
  ok(await p.locator(".menu-sheet").isVisible(), "mobile menu opens");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  ok((await p.locator(".menu-sheet").count()) === 0, "Escape closes mobile menu");
  const small = await p.evaluate(() => [...document.querySelectorAll("a[href], button, input, [role=tab]")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && (r.height < 43.5 || (r.width < 43.5 && e.tagName !== "A")) && !e.classList.contains("sr-only") && !e.closest(".sr-only, .skip-link"); }).map((e) => `${e.tagName}.${(e.className || "").toString().slice(0, 28)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  console.log("INFO sub-44px targets on mobile (top of page):", small.slice(0, 10));
  ok(errs.length === 0, "no page errors");
  await ctx.close();
}
await b.close();
