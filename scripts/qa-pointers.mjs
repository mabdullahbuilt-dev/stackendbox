// Verifies the Specialized chapter pointer behaviours: Market crosshair, Web3 transaction metadata, Developer dependency hover.
// Also checks they leave no stuck state after rapid tab switching. node scripts/qa-pointers.mjs [url]
import { chromium } from "playwright-core";
const URL = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && !/Failed to load resource|cal\.com/.test(m.text()) && errs.push(m.text()));
await p.goto(URL, { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
let fails = 0; const log = (ok, m) => { console.log(ok ? "PASS" : "FAIL", m); if (!ok) fails++; };
await p.evaluate(() => document.querySelector("#specialized .spc__stage").scrollIntoView({ block: "center" }));
await p.waitForTimeout(600);
const tabs = p.locator("#specialized [role=tab]");
// Market
await tabs.nth(0).click(); await p.waitForTimeout(1200);
const chart = p.locator("#specialized .mk__chart"); const cb = await chart.boundingBox();
await p.mouse.move(cb.x + cb.width * 0.4, cb.y + cb.height * 0.5, { steps: 5 }); await p.waitForTimeout(200);
log(await p.locator("#specialized .mk__cross").count() === 1, "market: crosshair follows the pointer inside the chart");
await p.mouse.move(cb.x - 40, cb.y - 40); await p.waitForTimeout(150);
log(await p.locator("#specialized .mk__cross").count() === 0, "market: crosshair removed when the pointer leaves");
// Web3
await tabs.nth(1).click(); await p.waitForTimeout(4200);
const tx = p.locator("#specialized .w3__mid"); const tb = await tx.boundingBox();
await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 5 }); await p.waitForTimeout(400);
const metaOp = await p.locator("#specialized .w3__meta").evaluate((e) => getComputedStyle(e).opacity);
log(+metaOp > 0.9, `web3: hovering the transaction shows hash metadata (opacity ${metaOp})`);
await p.mouse.move(10, 10); await p.waitForTimeout(400);
log(+(await p.locator("#specialized .w3__meta").evaluate((e) => getComputedStyle(e).opacity)) < 0.1, "web3: metadata hides on leave");
// Developer
await tabs.nth(2).click(); await p.waitForTimeout(2500);
const node = p.locator("#specialized .dv__graph g").nth(1); const nb = await node.boundingBox();
await p.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2, { steps: 5 }); await p.waitForTimeout(300);
log(await p.locator('#specialized .dv__graph g[data-hover="true"]').count() === 1, "developer: hovering a package highlights it and its dependencies");
await p.mouse.move(10, 10); await p.waitForTimeout(300);
log(await p.locator('#specialized .dv__graph g[data-hover="true"]').count() === 0, "developer: highlight clears on leave");
// rapid switching while hovering: nothing stuck
for (let i = 0; i < 15; i++) { await tabs.nth(i % 3).click(); await p.mouse.move(cb.x + Math.random() * cb.width, cb.y + Math.random() * cb.height); }
await p.mouse.move(5, 5); await p.waitForTimeout(500);
log(await p.locator("#specialized .mk__cross").count() === 0 && await p.locator('#specialized g[data-hover="true"]').count() === 0, "rapid tab switching leaves no stuck pointer state");
// offscreen: no pointer state written when the chapter is not active
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
for (let i = 0; i < 10; i++) await p.mouse.move(100 + i * 50, 300);
const px = await p.evaluate(() => document.getElementById("specialized").style.getPropertyValue("--px"));
log(px === "" || px === "0", `offscreen chapter receives no pointer updates (--px "${px}")`);
log(errs.length === 0, `no console/page errors (${errs.length}) ${errs[0] || ""}`);
await b.close(); process.exit(fails ? 1 : 0);
