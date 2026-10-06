// Real LCP with CPU 4x + slow 4G on a mobile viewport. node scripts/lcp.mjs [url]
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const c = await ctx.newCDPSession(p);
await c.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await c.send("Network.enable");
await c.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await p.addInitScript(() => { window.__l = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__l.push([Math.round(e.startTime), e.element?.className?.toString().slice(0, 30), e.size]))).observe({ type: "largest-contentful-paint", buffered: true }); new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__l.push(["FCP", Math.round(e.startTime)]))).observe({ type: "paint", buffered: true }); });
await p.goto(process.argv[2] || "http://localhost:3100", { waitUntil: "load" });
await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(() => window.__l)));
await b.close();
