// Contact Us block: three real destinations, tap targets, no overflow, form first on phones, footer WhatsApp link.
// Usage: node scripts/qa-contact.mjs [WxH ...]
import { chromium } from "playwright-core";
const VPS = (process.argv.slice(2).length ? process.argv.slice(2) : ["1440x900", "1366x768", "1280x800", "1024x768", "820x1180", "768x1024", "430x932", "390x844", "375x812", "360x800"]).map((s) => s.split("x").map(Number));
const URL = process.env.URL || "http://localhost:3100/";
const WA = "https://wa.me/message/4LZFXFNE5TT7O1";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
const fail = (m) => { bad++; console.log("   FAIL " + m); };
for (const [w, h] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>wa</title>" }));
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
  await p.evaluate(() => document.getElementById("start").scrollIntoView({ block: "start" })); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const side = document.querySelector("#start .ct__side"), form = document.querySelector("#start .ct__card");
    const a = (s) => document.querySelector(s);
    const ways = [...document.querySelectorAll("#start .ct__way")].map((e) => { const q = e.getBoundingClientRect(); return { tag: e.tagName, href: e.getAttribute("href"), target: e.getAttribute("target"), rel: e.getAttribute("rel"), label: e.getAttribute("aria-label"), h: Math.round(q.height), w: Math.round(q.width), text: e.innerText.replace(/\s+/g, " ") }; });
    const phone = a("#start .ct__phone a");
    const sr = side.getBoundingClientRect(), fr = form.getBoundingClientRect();
    return { ways, phone: phone && { href: phone.getAttribute("href"), text: phone.textContent, h: Math.round(phone.getBoundingClientRect().height) }, below: sr.top >= fr.bottom - 2, beside: sr.left >= fr.right - 2, overflowX: document.documentElement.scrollWidth - innerWidth, sideRight: Math.round(sr.right), headings: [...document.querySelectorAll("#start h3")].filter((x) => /contact us/i.test(x.textContent)).length, footerWa: document.querySelector('footer a[href^="https://wa.me/"]')?.getAttribute("href"), waIcon: !!a('#start .ct__way--wa svg path') };
  });
  console.log(`${w}x${h}: ${r.ways.length} ways, side ${r.beside ? "beside" : r.below ? "below" : "?"} form, overflow ${r.overflowX}`);
  if (r.ways.length !== 3) fail("expected 3 contact ways, got " + r.ways.length);
  const [em, wa, cal] = r.ways;
  if (!em?.href?.startsWith("mailto:hello@stackendbox.com")) fail("email href " + em?.href);
  if (wa?.href !== WA || wa.target !== "_blank" || !/noopener/.test(wa.rel || "") || !/noreferrer/.test(wa.rel || "") || wa.label !== "Message StackEndBox on WhatsApp") fail("whatsapp link " + JSON.stringify(wa));
  if (cal?.tag !== "BUTTON" || !/Book a call/i.test(cal.text)) fail("cal " + JSON.stringify(cal));
  for (const x of r.ways) if (x.h < 44) fail("tap target " + x.h + " " + x.text);
  if (!r.phone || r.phone.href !== "tel:+447366847680" || r.phone.text !== "+44 7366 847680") fail("phone " + JSON.stringify(r.phone));
  if (r.phone && r.phone.h < 24) fail("phone tap height " + r.phone.h);
  if (r.overflowX > 0) fail("horizontal overflow " + r.overflowX);
  if (r.sideRight > w) fail("side column off-screen");
  if (w < 960 && !r.below) fail("contact block must sit under the form on narrow screens");
  if (w >= 1100 && !r.beside) fail("contact block must sit beside the form on desktop");
  if (r.headings !== 1) fail("Contact us headings " + r.headings);
  if (r.footerWa !== WA) fail("footer whatsapp " + r.footerWa);
  if (!r.waIcon) fail("whatsapp icon missing");
  if (errs.length) fail("console errors " + errs.slice(0, 2).join(" | "));
  // WhatsApp opens a new tab at the configured URL (request intercepted: no real navigation off-site)
  const [pop] = await Promise.all([ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null), p.locator("#start .ct__way--wa").click()]);
  if (!pop) fail("whatsapp did not open a new tab"); else { const u = pop.url(); if (u !== WA) fail("popup url " + u); await pop.close(); }
  // Book a call opens the Cal popup / tab
  await p.locator("#start button.ct__way").click(); await p.waitForTimeout(3500);
  const calOpen = await p.evaluate(() => !!document.querySelector("cal-modal-box, iframe[src*='cal.com'], [id^='cal-']")) || ctx.pages().length > 1;
  if (!calOpen) fail("book a call did not open anything");
  await ctx.close();
}
await b.close();
console.log(bad ? `FAILED ${bad}` : "ALL PASSED");
process.exit(bad ? 1 : 0);
