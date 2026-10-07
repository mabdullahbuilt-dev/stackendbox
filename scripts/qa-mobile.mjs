// Mobile + tablet hardening QA. Touch emulation (isMobile + hasTouch + DPR) across a phone/tablet matrix.
// Usage: node scripts/qa-mobile.mjs [--engine=chromium|webkit|firefox] [--only=a,b] [WxH ...]
// Checks: page overflow (names the offending element), console/page errors, tap targets, form control font size
// (iOS auto-zoom), hover-only reveals on touch, nav usability, vertical swipe over carousels still scrolls, horizontal swipe
// moves the carousel, contact actions, orientation round trips, viewport-height jitter (browser chrome), reduced motion.
// Emulation is not a physical device: results are labelled by engine.
import { chromium, webkit, firefox } from "playwright-core";

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
const ENGINE = opt("engine", "chromium");
const ONLY = opt("only", "").split(",").filter(Boolean);
const DESKTOP = args.includes("--desktop"); // fine pointer, no touch: used for the desktop reduced-motion / overflow check
const URL = process.env.URL || "http://localhost:3100/";
const WA = "https://wa.me/message/4LZFXFNE5TT7O1";

const MATRIX = [
  // small phones
  [320, 568, 2], [360, 800, 3], [375, 667, 2], [375, 812, 3],
  // modern iPhones
  [390, 844, 3], [393, 852, 3], [402, 874, 3], [430, 932, 3],
  // Android
  [360, 780, 3], [384, 832, 3], [412, 892, 2.625], [412, 915, 2.625], [432, 960, 2.5],
  // tablets portrait
  [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1194, 2], [1024, 1366, 2],
  // tablets landscape
  [1024, 768, 2], [1080, 810, 2], [1180, 820, 2], [1194, 834, 2], [1366, 1024, 2],
];
const argSizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => [...s.split("x").map(Number), 2]);
const SIZES = argSizes.length ? argSizes : MATRIX;
const want = (name) => !ONLY.length || ONLY.includes(name);

const launcher = { chromium, webkit, firefox }[ENGINE];
const launchOpts = ENGINE === "chromium" ? { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" } : {};
const browser = await launcher.launch(launchOpts);

const fails = [];
const notes = [];
const fail = (vp, m) => { fails.push(`${vp} ${m}`); };
const note = (vp, m) => { notes.push(`${vp} ${m}`); };

async function open(w, h, dpr, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: !DESKTOP && ENGINE !== "firefox", hasTouch: !DESKTOP, ...extra });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push("console: " + m.text()); });
  await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>wa</title>" }));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(800);
  return { ctx, p, errs };
}

// in-page helpers -----------------------------------------------------------------------------------------------
const OVERFLOW = () => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const offenders = [];
  if (sw > vw + 1) {
    const clipped = (el) => { for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true; } return false; };
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1 && !clipped(el)) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}#${el.closest("section")?.id ?? "?"} right=${Math.round(r.right)}`);
      if (offenders.length > 4) break;
    }
  }
  return { vw, sw, offenders };
};

const TAPS = () => {
  const out = [];
  const sel = "a[href], button, [role=tab], [role=button], input, select, textarea, summary, label[for]";
  const vh = innerHeight, vw = innerWidth;
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest("[inert], [aria-hidden=true]") && !el.matches("input, textarea")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none" || +cs.opacity < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    if (el.classList.contains("sr-only") || el.classList.contains("skip") || el.classList.contains("hp") || el.closest(".hp")) continue;
    // inline links inside running text are exempt (typography), as are controls whose hit area is extended by ::after/padding of the parent
    const inline = el.tagName === "A" && cs.display === "inline" && !!el.closest("p, li, dd, blockquote");
    if (inline) continue;
    if (el.closest(".sec-head") && el.tagName === "H2") continue;
    if (el.classList.contains("aorb__sat")) { const pb = parseFloat(getComputedStyle(el, "::before").height) || 0; if (Math.max(r.height, pb) < 43.5) out.push({ t: "button.aorb__sat", label: el.getAttribute("aria-label").slice(0, 28), w: Math.round(r.width), h: Math.round(Math.max(r.height, pb)), sec: "ai" }); continue; } // orbiting: probed by its computed ::before instead
    // effective hit area, exact: the control's box united with an absolutely positioned ::before extension. The point probe only
    // confirms that the centre really lands on this control (not covered / mid-transition).
    const hits = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    if (!el.closest("header, .nav") && (cy < 76 || cy > vh - 6 || r.top < 70)) continue; // under the fixed nav or on the fold edge here: sampled at another scroll stop
    if (!hits(cx, cy)) continue; // covered or mid-transition at this instant: covered controls are qa-clicks' job
    let L = r.left, T = r.top, R = r.right, B = r.bottom;
    const pc = getComputedStyle(el, "::before");
    if (pc.content !== "none" && pc.position === "absolute") {
      const pl = parseFloat(pc.left), pt = parseFloat(pc.top), pw = parseFloat(pc.width), ph = parseFloat(pc.height);
      if ([pl, pt, pw, ph].every(Number.isFinite)) { const bl = r.left + el.clientLeft, bt = r.top + el.clientTop; L = Math.min(L, bl + pl); T = Math.min(T, bt + pt); R = Math.max(R, bl + pl + pw); B = Math.max(B, bt + pt + ph); }
    }
    const ew = R - L, eh = B - T;
    const m = Math.min(ew, eh);
    if (m < 43.9) out.push({ t: `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0] || ""}`, label: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("href") || "").trim().replace(/\s+/g, " ").slice(0, 28), w: Math.round(ew * 10) / 10, h: Math.round(eh * 10) / 10, sec: el.closest("section,header,footer")?.id || el.closest("header,footer")?.tagName || "?" });
  }
  return out;
};

// extended hit rectangles (element box united with an absolutely positioned ::before) must not overlap a neighbour's
const HITS = () => {
  const out = [];
  const vh = innerHeight, vw = innerWidth;
  const sel = "a[href], button, [role=tab], [role=button], input, select, textarea, summary";
  const els = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest("[inert], [aria-hidden=true]")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none" || +cs.opacity < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    if (el.classList.contains("sr-only") || el.classList.contains("skip") || el.closest(".hp")) continue;
    let h = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    const pc = getComputedStyle(el, "::before");
    if (pc.content !== "none" && pc.position === "absolute") {
      const pl = parseFloat(pc.left), pt = parseFloat(pc.top), w = parseFloat(pc.width), hh = parseFloat(pc.height);
      if ([pl, pt, w, hh].every(Number.isFinite)) {
        const bl = r.left + el.clientLeft, bt = r.top + el.clientTop;
        h = { l: Math.min(h.l, bl + pl), t: Math.min(h.t, bt + pt), r: Math.max(h.r, bl + pl + w), b: Math.max(h.b, bt + pt + hh) };
      }
    }
    els.push({ el, r, h, label: (el.getAttribute("aria-label") || el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 22) });
  }
  const inter = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
  const inside = (i, r) => i.l >= r.left - 1 && i.t >= r.top - 1 && i.r <= r.right + 1 && i.b <= r.bottom + 1;
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const A = els[i], B = els[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const x = inter(A.h, B.h);
    if (x.r - x.l < 2 || x.b - x.t < 2) continue;
    if (inside(x, A.r) || inside(x, B.r)) continue; // the boxes themselves overlap: a layout matter (qa-collide), not an extension
    out.push(`${A.label} <> ${B.label} (${Math.round(x.r - x.l)}x${Math.round(x.b - x.t)}px) #${A.el.closest("section,header,footer")?.id || "?"}`);
  }
  return out;
};

async function sweep(p, step, fn) {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = await p.evaluate(() => innerHeight);
  const res = [];
  for (let y = 0; y < H; y += step ?? Math.round(vh * 0.8)) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await p.waitForTimeout(160);
    res.push(await fn(y));
  }
  return res;
}

// real touch sequence through CDP (Input.synthesizeScrollGesture is not honoured in headless emulation)
async function swipe(cdp, p, x0, y0, x1, y1, steps = 14) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(700);
}

async function goTo(p, sel, off = 70) {
  await p.evaluate(([sel, off]) => { const e = document.querySelector(sel); if (e) scrollTo(0, scrollY + e.getBoundingClientRect().top - off); }, [sel, off]);
  await p.waitForTimeout(900);
}

// per-viewport checks -------------------------------------------------------------------------------------------
async function perViewport([w, h, dpr]) {
  const vp = `${ENGINE} ${w}x${h}@${dpr}`;
  const { ctx, p, errs } = await open(w, h, dpr);
  const touchLayout = await p.evaluate(() => matchMedia("(hover: none), (pointer: coarse)").matches);
  if (!touchLayout && ENGINE === "chromium") note(vp, "media (hover:none)/(pointer:coarse) not matched under emulation");

  if (want("overflow")) {
    // load scroll through so lazy/content-visibility sections render, then sample at rest
    const rows = await sweep(p, null, () => p.evaluate(OVERFLOW));
    const worst = rows.reduce((a, b) => (b.sw - b.vw > a.sw - a.vw ? b : a), rows[0]);
    if (worst.sw > worst.vw + 1) fail(vp, `page overflow ${worst.sw}>${worst.vw} :: ${worst.offenders.join(" | ")}`);
  }

  if (want("taps")) {
    const seen = new Map();
    await sweep(p, null, () => p.evaluate(TAPS).then((a) => { for (const x of a) seen.set(`${x.t}|${x.label}|${x.sec}`, x); }));
    const ov = new Set();
    await sweep(p, null, () => p.evaluate(HITS).then((a) => a.forEach((x) => ov.add(x))));
    for (const x of ov) fail(vp, `overlapping tap areas: ${x}`);
    for (const x of seen.values()) fail(vp, `effective tap area (< 44px) ${x.w}x${x.h} ${x.t} "${x.label}" #${x.sec}`);
  }

  if (want("inputs")) {
    await goTo(p, "#start");
    const fs = await p.evaluate(() => [...document.querySelectorAll("#start input:not([type=hidden]):not(.hp), #start textarea, #start select")].map((e) => ({ n: e.name || e.id, fs: parseFloat(getComputedStyle(e).fontSize) })));
    for (const x of fs) if (x.fs < 16) fail(vp, `form control "${x.n}" font-size ${x.fs}px < 16px (iOS auto-zoom)`);
    // focus each field: it must stay visible, below the fixed nav, and the page must not scroll horizontally
    const inputs = p.locator("#start input:not([type=hidden]):not(.hp), #start textarea");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      await inputs.nth(i).focus();
      await p.waitForTimeout(250);
      const r = await p.evaluate((i) => { const e = document.querySelectorAll("#start input:not([type=hidden]):not(.hp), #start textarea")[i]; const b = e.getBoundingClientRect(); const nav = document.querySelector(".nav, header"); const nb = nav ? nav.getBoundingClientRect() : { bottom: 0 }; return { top: b.top, bottom: b.bottom, vh: innerHeight, navBottom: nb.bottom, sx: document.documentElement.scrollWidth - innerWidth, z: visualViewport.scale }; }, i);
      if (r.bottom < 0 || r.top > r.vh) fail(vp, `focused field #${i} not visible (${Math.round(r.top)}..${Math.round(r.bottom)} of ${r.vh})`);
      if (r.top < r.navBottom - 2) fail(vp, `focused field #${i} sits under the fixed nav (top ${Math.round(r.top)} < nav ${Math.round(r.navBottom)})`);
      if (r.sx > 1) fail(vp, `horizontal overflow after focusing field #${i} (${r.sx}px)`);
      if (r.z !== 1) fail(vp, `visual viewport scaled to ${r.z} after focus (auto-zoom)`);
    }
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
  }

  if (want("keyboard")) {
    // software keyboard: the viewport loses ~45% of its height. The focused field must stay visible below the nav and the submit
    // button must stay reachable; closing the keyboard must restore the layout.
    await goTo(p, "#start");
    const kh = Math.round(h * 0.55);
    const fields = p.locator("#start input:not([type=hidden]):not(.hp), #start textarea");
    const n = await fields.count();
    for (const i of [0, n - 1]) {
      await fields.nth(i).focus();
      await p.setViewportSize({ width: w, height: kh }); await p.waitForTimeout(350);
      await fields.nth(i).evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })).catch(() => {});
      await p.waitForTimeout(200);
      const r = await p.evaluate((i) => { const e = document.querySelectorAll("#start input:not([type=hidden]):not(.hp), #start textarea")[i]; const b = e.getBoundingClientRect(); const nav = document.querySelector(".nav, header"); return { top: b.top, bottom: b.bottom, vh: innerHeight, nav: nav ? nav.getBoundingClientRect().bottom : 0, sx: document.documentElement.scrollWidth - innerWidth }; }, i);
      if (r.top < r.nav - 2 || r.bottom > r.vh + 1) fail(vp, `keyboard open: field #${i} not fully visible (${Math.round(r.top)}..${Math.round(r.bottom)}, nav ${Math.round(r.nav)}, vh ${r.vh})`);
      if (r.sx > 1) fail(vp, `keyboard open: horizontal overflow ${r.sx}`);
      const btn = p.locator("#start button[type=submit]");
      await btn.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      const bb = await btn.boundingBox();
      if (!bb || bb.y < 0 || bb.y + bb.height > kh) fail(vp, "keyboard open: submit button not reachable");
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350);
      const o = await p.evaluate(OVERFLOW);
      if (o.sw > o.vw + 1) fail(vp, "keyboard closed: overflow " + o.sw);
    }
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
  }

  if (want("contact")) {
    await goTo(p, "#start");
    const r = await p.evaluate(() => {
      const form = document.querySelector("#start .ct__card").getBoundingClientRect(), side = document.querySelector("#start .ct__side").getBoundingClientRect();
      const ways = [...document.querySelectorAll("#start .ct__way")].map((e) => { const b = e.getBoundingClientRect(); return { href: e.getAttribute("href"), h: Math.round(b.height), w: Math.round(b.width), text: e.innerText.replace(/\s+/g, " ") }; });
      const phone = document.querySelector("#start .ct__phone a");
      return { formFirst: side.top >= form.bottom - 2 || side.left >= form.right - 2, ways, phone: phone && { href: phone.getAttribute("href"), h: Math.round(phone.getBoundingClientRect().height) } };
    });
    if (!r.formFirst) fail(vp, "contact block is not after the form");
    if (r.ways.length !== 3) fail(vp, "expected 3 contact ways");
    if (r.ways[0]?.href?.indexOf("mailto:hello@stackendbox.com") !== 0) fail(vp, "email href");
    if (r.ways[1]?.href !== WA) fail(vp, "whatsapp href");
    for (const x of r.ways) if (x.h < 44) fail(vp, `contact way tap height ${x.h}`);
    if (r.phone?.href !== "tel:+447366847680") fail(vp, "tel href");
    // tapping WhatsApp opens a tab at the wa.me URL; Book a call opens a modal/tab
    const [pop] = await Promise.all([ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null), p.locator("#start .ct__way--wa").tap()]);
    if (!pop) fail(vp, "whatsapp tap opened nothing"); else { if (pop.url() !== WA) fail(vp, "whatsapp popup url " + pop.url()); await pop.close(); }
    await p.locator("#start button.ct__way").tap(); await p.waitForTimeout(3500);
    const cal = await p.evaluate(() => !!document.querySelector("cal-modal-box, iframe[src*='cal.com'], [id^='cal-']")) || ctx.pages().length > 1;
    if (!cal) fail(vp, "book a call tap opened nothing");
    for (const x of ctx.pages()) if (x !== p) await x.close().catch(() => {});
    // the live Cal modal (when the network allows it) sits over the page until closed
    await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelectorAll("cal-modal-box, [id^='cal-'], iframe[src*='cal.com']").forEach((e) => e.remove())).catch(() => {});
  }

  if (want("nav")) {
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const nav = document.querySelector(".nav, header"); const b = nav.getBoundingClientRect();
      const menu = [...document.querySelectorAll("button")].find((e) => /menu/i.test(e.getAttribute("aria-label") || e.innerText) && e.getBoundingClientRect().width > 0);
      const links = [...nav.querySelectorAll("a, button")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const q = e.getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom), name: (e.getAttribute("aria-label") || e.innerText).trim().slice(0, 20) }; });
      let overlap = null;
      for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) { const a = links[i], c = links[j]; if (a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1) overlap = `${a.name} / ${c.name}`; }
      return { h: Math.round(b.height), vh: innerHeight, menu: !!menu, menuSize: menu && [Math.round(menu.getBoundingClientRect().width), Math.round(menu.getBoundingClientRect().height)], overlap, overflow: links.some((x) => x.r > innerWidth + 1 || x.l < -1) };
    });
    if (r.overlap) fail(vp, `nav items overlap: ${r.overlap}`);
    if (r.overflow) fail(vp, "nav item outside viewport");
    if (r.h > r.vh * 0.2) fail(vp, `nav takes ${r.h}px of ${r.vh}px`);
    if (w < 768) {
      if (!r.menu) fail(vp, "no menu button on phone width");
      else if (Math.min(...r.menuSize) < 44) fail(vp, `menu button ${r.menuSize.join("x")} < 44`);
      await p.getByRole("button", { name: /menu/i }).first().tap(); await p.waitForTimeout(600);
      const dlg = await p.getByRole("dialog").count();
      if (!dlg) fail(vp, "menu did not open");
      else {
        const contact = p.getByRole("dialog").getByText("Contact Us", { exact: true }).first();
        const vis = await contact.isVisible().catch(() => false);
        if (!vis) fail(vp, "Contact Us not visible in the open menu");
        await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      }
    }
  }

  if (want("swipe") && ENGINE === "chromium") {
    // vertical swipe starting on the Selected Work stage must scroll the page; a horizontal swipe must move the carousel
    await goTo(p, "#work .shw__view", 120);
    const box = await p.locator("#work .shw__view").boundingBox();
    if (box) {
      const cdp = await ctx.newCDPSession(p);
      const cx = Math.round(box.x + box.width / 2), cy = Math.round(Math.min(box.y + box.height / 2, h - 120));
      const y0 = await p.evaluate(() => scrollY);
      await swipe(cdp, p, cx, cy, cx, cy - 200);
      const y1 = await p.evaluate(() => scrollY);
      if (y1 - y0 < 100) fail(vp, `vertical swipe over Selected Work did not scroll the page (${Math.round(y1 - y0)}px)`);
      // a slightly diagonal, mostly vertical swipe must also scroll the page without changing the slide
      await goTo(p, "#work .shw__view", 120);
      const cur = () => p.evaluate(() => document.querySelector("#work .shw__tab[aria-current=true] .shw__tabn")?.textContent);
      const c0 = await cur();
      const yd0 = await p.evaluate(() => scrollY);
      await swipe(cdp, p, cx - 15, cy, cx + 15, cy - 200);
      const yd1 = await p.evaluate(() => scrollY);
      if (yd1 - yd0 < 100) fail(vp, `diagonal swipe did not scroll the page (${Math.round(yd1 - yd0)}px)`);
      if (c0 !== (await cur())) note(vp, "mostly vertical swipe changed the Selected Work slide");
      await goTo(p, "#work .shw__view", 120);
      const b2 = await p.locator("#work .shw__view").boundingBox();
      const c1 = await cur();
      const hx = Math.round(b2.x + b2.width * 0.8), hy = Math.round(Math.min(b2.y + b2.height / 2, h - 120));
      const yh0 = await p.evaluate(() => scrollY);
      await swipe(cdp, p, hx, hy, hx - 220, hy);
      const c2 = await cur();
      if (c1 === c2) fail(vp, `horizontal swipe did not advance Selected Work (${c1})`);
      if (Math.abs((await p.evaluate(() => scrollY)) - yh0) > 40) fail(vp, "horizontal swipe also scrolled the page");
    }
  }

  if (want("meta")) {
    const vm = await p.evaluate(() => document.querySelector("meta[name=viewport]")?.getAttribute("content") || "");
    if (/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(vm)) fail(vp, `pinch zoom disabled by viewport meta: ${vm}`);
    if (!/width=device-width/.test(vm)) fail(vp, `viewport meta: ${vm}`);
  }

  if (want("reveal")) {
    // information that used to be hover-only must be reachable by tap: Web3 transaction metadata
    await goTo(p, "#specialized");
    const tab = p.getByRole("tab", { name: /web3/i }).first();
    if (await tab.count()) {
      await tab.tap(); await p.waitForTimeout(500);
      let shown = false;
      for (let k = 0; k < 24 && !shown; k++) { shown = await p.evaluate(() => { const m = document.querySelector(".w3__mid"); return !!m && m.getAttribute("data-pos") !== "hidden" && m.getBoundingClientRect().width > 0; }); if (!shown) await p.waitForTimeout(500); }
      if (!shown) note(vp, "web3 transaction card did not appear in 12s; metadata tap not exercised");
      else {
        const mid = p.locator(".w3__mid").first();
        await mid.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await p.waitForTimeout(300);
        await mid.tap({ force: true }); await p.waitForTimeout(500);
        const op = await p.evaluate(() => +getComputedStyle(document.querySelector(".w3__meta")).opacity);
        if (op < 0.9) fail(vp, `web3 metadata not shown after tap (opacity ${op})`);
        // keyboard path: focus via Tab must show it too
        await p.evaluate(() => document.activeElement && document.activeElement.blur());
        await mid.focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab"); await p.waitForTimeout(300);
        const op2 = await p.evaluate(() => +getComputedStyle(document.querySelector(".w3__meta")).opacity);
        if (op2 < 0.9) fail(vp, `web3 metadata not shown on keyboard focus (opacity ${op2})`);
      }
    } else note(vp, "no web3 tab found");
  }

  if (want("overlays")) {
    // fixed overlays must not sit flush against the viewport edge
    const edge = async (label, sel) => {
      const r = await p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: innerWidth - b.right, b: innerHeight - b.bottom, name: (e.getAttribute("aria-label") || e.innerText || "").trim().slice(0, 18) }; }), sel);
      for (const x of r) if (x.l < 8 || x.t < 8 || x.r < 8 || x.b < 0) fail(vp, `${label} control "${x.name}" is flush against the viewport edge (l${Math.round(x.l)} t${Math.round(x.t)} r${Math.round(x.r)})`);
    };
    if (w < 768) {
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.getByRole("button", { name: /menu/i }).first().tap(); await p.waitForTimeout(600);
      await edge("menu", '[role=dialog] button, [role=dialog] a.btn');
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    }
    await goTo(p, "#work .shw__view", 120);
    const z = p.locator("#work .shw__zoom").first();
    if (await z.count()) {
      await z.tap(); await p.waitForTimeout(600);
      if (!(await p.evaluate(() => !!document.querySelector("dialog.shw__dlg[open]")))) fail(vp, "Full size viewer did not open on tap");
      else {
        await edge("viewer", "dialog.shw__dlg .shw__x");
        const closeSz = await p.evaluate(() => { const b = document.querySelector("dialog.shw__dlg .shw__x").getBoundingClientRect(); return Math.min(b.width, b.height); });
        if (closeSz < 43.5) fail(vp, `viewer close button ${closeSz}px < 44`);
        await p.locator("dialog.shw__dlg .shw__x").tap(); await p.waitForTimeout(500);
        if (await p.evaluate(() => !!document.querySelector("dialog.shw__dlg[open]"))) fail(vp, "viewer did not close on tap of the close button");
      }
    }
  }

  if (want("hover")) {
    // anything revealed only by :hover must be reachable by tap/visible on touch: list rules outside a (hover:hover) gate
    const gated = await p.evaluate(() => {
      const bad = [];
      const walk = (rules, inHover) => { for (const r of rules) { if (r.type === 4) walk(r.cssRules, inHover || /hover:\s*hover/.test(r.conditionText || r.media.mediaText)); else if (r.selectorText && /:hover/.test(r.selectorText) && !inHover) { const s = r.style; if (/opacity|visibility|display|translate|transform|height|max-height|clip/.test(s.cssText) && r.selectorText.length < 160) bad.push(r.selectorText.slice(0, 90)); } } };
      for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch {} }
      return bad;
    });
    for (const g of gated) note(vp, `hover rule outside (hover:hover): ${g}`);
  }

  if (want("orient")) {
    const sec = () => p.evaluate(() => { let best = null; for (const s of document.querySelectorAll("main section[id]")) { const b = s.getBoundingClientRect(); if (b.top <= innerHeight * 0.4 && b.bottom > innerHeight * 0.4) best = s.id; } return best; });
    for (const id of ["#ai", "#proof", "#process", "#start"]) {
      await goTo(p, id);
      const before = await sec();
      await p.setViewportSize({ width: h, height: w }); await p.waitForTimeout(1200);
      const o1 = await p.evaluate(OVERFLOW);
      if (o1.sw > o1.vw + 1) fail(vp, `landscape ${h}x${w} overflow ${o1.sw}>${o1.vw} ${o1.offenders.join("|")}`);
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(1200);
      const o2 = await p.evaluate(OVERFLOW);
      if (o2.sw > o2.vw + 1) fail(vp, `back to portrait overflow ${o2.sw}>${o2.vw} ${o2.offenders.join("|")}`);
      const after = await sec();
      if (before && after && before !== after) note(vp, `orientation round trip from ${id} landed in #${after} (was #${before})`);
    }
  }

  if (want("chrome")) {
    // browser-chrome show/hide: repeated viewport-height changes must not break a pinned scene's release or overflow
    for (const id of ["#process", "#depth"]) {
      await goTo(p, id);
      for (const dh of [-90, 0, -60, 0, -90, 0]) { await p.setViewportSize({ width: w, height: Math.max(300, h + dh) }); await p.waitForTimeout(160); }
      const o = await p.evaluate(OVERFLOW);
      if (o.sw > o.vw + 1) fail(vp, `overflow after height jitter at ${id}`);
    }
  }

  if (want("reduced")) {
    const rctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: !DESKTOP && ENGINE !== "firefox", hasTouch: !DESKTOP, reducedMotion: "reduce" });
    const rp = await rctx.newPage(); const re = [];
    rp.on("pageerror", (e) => re.push(e.message)); rp.on("console", (m) => m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED/.test(m.text()) && re.push(m.text()));
    await rp.goto(URL, { waitUntil: "networkidle" }); await rp.waitForTimeout(600);
    const rows = await sweep(rp, null, () => rp.evaluate(OVERFLOW));
    const worst = rows.reduce((a, b) => (b.sw - b.vw > a.sw - a.vw ? b : a), rows[0]);
    if (worst.sw > worst.vw + 1) fail(vp, `reduced-motion overflow ${worst.sw}>${worst.vw} ${worst.offenders.join("|")}`);
    const canvases = await rp.evaluate(() => document.querySelectorAll("canvas").length);
    const blank = await rp.evaluate(() => [...document.querySelectorAll("main section[id]")].filter((s) => s.getBoundingClientRect().height > 120 && s.textContent.trim().length < 20).map((s) => s.id));
    if (canvases) fail(vp, `reduced motion still mounts ${canvases} canvas(es)`);
    if (blank.length) fail(vp, `reduced motion: sections without text ${blank.join(",")}`);
    if (re.length) fail(vp, `reduced-motion errors ${re.slice(0, 2).join(" | ")}`);
    await rctx.close();
  }

  if (errs.length) fail(vp, `console/page errors: ${[...new Set(errs)].slice(0, 3).join(" | ")}`);
  await ctx.close();
}

for (const s of SIZES) {
  try { await perViewport(s); } catch (e) { fail(`${ENGINE} ${s[0]}x${s[1]}`, "exception " + String(e).slice(0, 160)); }
  process.stdout.write(`.${s[0]}x${s[1]}`);
}
process.stdout.write("\n");
await browser.close();

// summarise notes (tap targets, hover rules) by frequency so the report stays readable
const groups = new Map();
for (const n of notes) { const k = n.replace(/^\S+ \S+ /, ""); groups.set(k, (groups.get(k) ?? 0) + 1); }
const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, c] of sorted.slice(0, 60)) console.log(`NOTE x${c} ${k}`);
for (const f of fails) console.log("FAIL " + f);
console.log(fails.length ? `FAILED ${fails.length} (${notes.length} notes)` : `ALL PASSED (${notes.length} notes)`);
process.exit(fails.length ? 1 : 0);
