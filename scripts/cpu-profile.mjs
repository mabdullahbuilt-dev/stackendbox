// Top script URLs by self time during load. node scripts/cpu-profile.mjs [url] [mobile|desktop]
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3100";
const mobile = (process.argv[3] ?? "mobile") === "mobile";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--disable-gpu", "--disable-webgl"] });
const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1350, height: 940 }, isMobile: mobile, hasTouch: mobile });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.start");
await p.goto(url, { waitUntil: "load" });
await p.waitForTimeout(4000);
const { profile } = await cdp.send("Profiler.stop");
const dt = profile.timeDeltas; const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.url.split("/").slice(-1)[0] || "(native)"} ${n.callFrame.functionName || "(anon)"}`; self.set(k, (self.get(k) ?? 0) + dt[i] / 1000); });
const byUrl = new Map(); for (const [k, v] of self) { const u = k.split(" ")[0]; byUrl.set(u, (byUrl.get(u) ?? 0) + v); }
console.log("BY FILE", [...byUrl].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${Math.round(v)}ms`).join("  "));
console.log("TOP FN", [...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}:${Math.round(v)}`).join("\n"));
await b.close();
