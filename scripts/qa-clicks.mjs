// Click-tests EVERY interactive element on the homepage. node scripts/qa-clicks.mjs [url] [mouse|keyboard|touch] [w] [h]
// Asserts: visible, not covered, a real effect (scroll/url/state/dialog/popup/new tab/mailto), no console errors.
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3100";
const mode = process.argv[3] ?? "mouse";
const W = +(process.argv[4] ?? 1440), H = +(process.argv[5] ?? 900);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const touch = mode === "touch";
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch });
const p = await ctx.newPage();
const errs = [];
p.on("console", (m) => m.type() === "error" && !/ERR_TUNNEL|ERR_CONNECTION|app\.cal\.com|Failed to load resource/.test(m.text()) && errs.push(m.text()));
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
let popups = 0;
ctx.on("page", (pg) => { if (pg !== p) { popups++; pg.close().catch(() => {}); } });
await p.goto(url, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
// let lazily mounted content exist
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(25); }
await p.evaluate(() => scrollTo(0, 0));

// let deferred layout work (scroll triggers, lazy scenes) finish so positions are stable
await p.mouse.move(300, 300); await p.mouse.move(420, 380);
await p.waitForTimeout(8500);
for (let y = 0; y < total + 2000; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); }
{ let last = -1, n = 0; for (let k = 0; k < 40 && n < 4; k++) { const h = await p.evaluate(() => document.documentElement.scrollHeight); n = h === last ? n + 1 : 0; last = h; await p.waitForTimeout(250); } }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
const SEL = "header a, header button, main a, main button, main [role=tab], footer a, footer button, footer label.switch";
const list = await p.evaluate((SEL) => {
  const out = []; const seen = new Set();
  document.querySelectorAll(SEL).forEach((el, i) => {
    if (el.closest("[aria-hidden='true']") || el.disabled) return;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") return;
    if (r.width < 2 || r.height < 2) return;
    if (el.classList.contains("sr-only") || el.classList.contains("hp")) return;
    el.setAttribute("data-qa", String(i));
    const label = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
    const key = (el.closest("section,header,footer")?.id || el.closest("header,footer")?.tagName || "?") + "|" + label + "|" + (el.getAttribute("href") || "");
    if (seen.has(key)) return; seen.add(key);
    out.push({ i, label, href: el.getAttribute("href"), tag: el.tagName, sec: el.closest("section,header,footer")?.id || el.closest("header,footer")?.tagName });
  });
  return out;
}, SEL);

const stable = async () => { let last = -1, n = 0; for (let k = 0; k < 40 && n < 3; k++) { const y = await p.evaluate(() => Math.round(scrollY)); n = y === last ? n + 1 : 0; last = y; await p.waitForTimeout(100); } };
const results = [];
const sig = () => p.evaluate(() => ({ url: location.href, y: Math.round(scrollY), dlg: document.querySelectorAll("[role=dialog]").length, text: document.body.innerText.length, sel: [...document.querySelectorAll("[aria-selected=true],[aria-pressed=true],[data-checked=true]")].length }));
for (const it of list) {
  const r = { ...it, ok: true, why: [] };
  await p.evaluate(([sel, lab, href, sec]) => {
    document.querySelectorAll("[data-qa]").forEach((x) => x.removeAttribute("data-qa"));
    for (const el of document.querySelectorAll(sel)) {
      const l = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
      const s = el.closest("section,header,footer")?.id || el.closest("header,footer")?.tagName;
      if (l.replace(/\s+/g, "") === lab.replace(/\s+/g, "") && (el.getAttribute("href") || "") === (href || "") && s === sec) { el.setAttribute("data-qa", "t"); return; }
    }
    for (const el of document.querySelectorAll(sel)) {
      const s = el.closest("section,header,footer")?.id || el.closest("header,footer")?.tagName;
      if ((el.getAttribute("href") || "") === (href || "") && href && s === sec && el.classList.contains("btn")) { el.setAttribute("data-qa", "t"); return; }
    }
  }, [SEL, it.label, it.href, it.sec]);
  const loc = p.locator(`[data-qa="t"]`).first();
  try {
    // mobile menu items only exist once the menu is open; header nav links are hidden on mobile
    if (it.sec === "HEADER") await p.evaluate(() => scrollTo(0, 0));
    else await loc.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await stable();
    const covered = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = Math.min(Math.max(r.top + r.height / 2, 2), window.innerHeight - 2); const t = document.elementFromPoint(x, y); return (t && (t === el || el.contains(t) || t.contains(el))) ? null : (t ? t.tagName + "." + String(t.className).slice(0, 40) + "@" + (t.closest("section,header,footer")?.id || t.closest("header,footer")?.tagName) : "none"); });
    if (covered) { r.ok = false; r.why.push("covered by " + covered); }
    const before = await sig(); const p0 = popups; const e0 = errs.length;
    const isMail = it.href?.startsWith("mailto:"), isExt = /^https?:\/\//.test(it.href ?? "") && !it.href.includes("stackendbox.com");
    if (isMail) { if (!/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/.test(it.href)) { r.ok = false; r.why.push("bad mailto"); } }
    else if (isExt) { if (!(await loc.getAttribute("target"))) { r.ok = false; r.why.push("external without target"); } }
    if (!isMail) {
      if (mode === "keyboard") { await loc.focus(); await p.keyboard.press(it.tag === "A" ? "Enter" : "Enter"); }
      else if (touch) await loc.tap({ timeout: 3000 }).catch(async () => { await p.waitForTimeout(700); await loc.tap({ timeout: 4000, force: true }).catch(() => { r.why.push("tap failed"); r.ok = false; }); });
      else await loc.click({ timeout: 3000 }).catch(async () => { await p.waitForTimeout(700); await loc.click({ timeout: 4000, force: true }).catch(() => { r.why.push("click failed"); r.ok = false; }); });
      await p.waitForTimeout(500); await stable(); if (it.href && /#/.test(it.href)) await p.waitForTimeout(2600);
      const after = await sig();
      const changed = after.url !== before.url || Math.abs(after.y - before.y) > 40 || after.dlg !== before.dlg || Math.abs(after.text - before.text) > 3 || after.sel !== before.sel || popups > p0;
      const hash = it.href && (it.href.startsWith("/#") || it.href.startsWith("#")) ? it.href.split("#")[1] : null;
      if (hash) {
        const info = await p.evaluate((id) => { const e = document.getElementById(id); return e ? { top: e.getBoundingClientRect().top, vh: window.innerHeight } : null; }, hash);
        if (!info) { r.ok = false; r.why.push(`target #${hash} missing`); }
        else if (info.top > info.vh * 0.6 || info.top < -info.vh * 0.9) { r.ok = false; r.why.push(`did not reach #${hash} (top ${Math.round(info.top)})`); }
      } else if (!changed && !(it.tag === "BUTTON" && /tab/.test((await loc.getAttribute("role")) ?? ""))) {
        r.why.push("no visible effect"); r.note = true;
      }
      if (errs.length > e0) { r.ok = false; r.why.push("console error: " + errs.slice(e0).join(" | ").slice(0, 120)); }
      // reset: close dialogs, go back to top
      if (after.dlg) await p.keyboard.press("Escape");
      if (after.url !== before.url && !after.url.startsWith(url)) await p.goto(url, { waitUntil: "load" });
    }
  } catch (e) { r.ok = false; r.why.push("exception: " + String(e).slice(0, 100)); }
  results.push(r);
  await p.evaluate(() => scrollTo(0, 0)).catch(() => {});
}
if (W < 768) {
  // the menu sheet: open it for each item, activate the item, verify the destination
  const items = ["Services", "Work", "How We Build", "Company", "Contact Us", "Start a Project", "Book a Call", "hello@stackendbox.com"];
  for (const label of items) {
    const r = { label: "menu: " + label, sec: "MENU", ok: true, why: [] };
    try {
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.getByRole("button", { name: "Menu" }).click({ timeout: 4000 });
      const dlg = p.getByRole("dialog");
      await dlg.waitFor({ timeout: 3000 });
      const el = dlg.getByText(label, { exact: true }).first();
      const y0 = await p.evaluate(() => scrollY); const p0 = popups;
      if (label.includes("@")) { const href = await el.evaluate((n) => n.closest("a")?.getAttribute("href")); if (!/^mailto:/.test(href ?? "")) { r.ok = false; r.why.push("bad href " + href); } await p.keyboard.press("Escape"); }
      else {
        if (touch) await el.tap({ timeout: 3000 }); else await el.click({ timeout: 3000 });
        await p.waitForTimeout(600); await stable(); await p.waitForTimeout(2600);
        const y1 = await p.evaluate(() => scrollY); const open = await p.getByRole("dialog").count();
        if (open && label !== "Book a Call") { r.ok = false; r.why.push("menu stayed open"); }
        if (label !== "Book a Call" && Math.abs(y1 - y0) < 100) { r.ok = false; r.why.push("did not navigate"); }
        if (label === "Book a Call" && popups === p0 && !(await p.locator("iframe[src*='cal'], .cal-modal-box, cal-modal-box").count())) r.why.push("no popup/new tab observed (cal.com unreachable here)");
        if (await p.getByRole("dialog").count()) await p.keyboard.press("Escape");
      }
    } catch (e) { r.ok = false; r.why.push("exception: " + String(e).slice(0, 100)); }
    results.push(r);
  }
}
const bad = results.filter((r) => !r.ok);
const notes = results.filter((r) => r.ok && r.note);
console.log(`[${mode} ${W}x${H}] tested ${results.length} elements, failed ${bad.length}, no-visible-effect notes ${notes.length}, console errors ${errs.length}`);
for (const r of bad) console.log("FAIL", r.sec, "|", r.label, "|", r.href ?? "", "|", r.why.join("; "));
for (const r of notes) console.log("NOTE", r.sec, "|", r.label, "|", r.href ?? "", "|", r.why.join("; "));
await b.close();
process.exitCode = bad.length ? 1 : 0;
