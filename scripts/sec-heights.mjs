// Section height audit: height in viewport units, pinned or not, and how far the first screen's content runs below the fold.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const a of process.argv.slice(2)) {
  const [w, h] = a.split("x").map(Number);
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(process.env.URL || "http://localhost:3100/", { waitUntil: "networkidle" });
  const rows = await p.evaluate(() => [...document.querySelectorAll("main > section[id], main section[id]")].filter((s, i, arr) => !arr.some((o) => o !== s && o.contains(s))).map((s) => {
    const r = s.getBoundingClientRect();
    return { id: s.id, vh: +(r.height / innerHeight).toFixed(2), pin: s.dataset.scroll === "pin" || !!s.querySelector("[class*=sticky]") };
  }));
  console.log(`${a}  total ${(rows.reduce((t, r) => t + r.vh, 0)).toFixed(1)} vh`);
  console.log(rows.map((r) => `  ${r.id.padEnd(13)} ${String(r.vh).padStart(5)} vh ${r.pin ? "pinned" : ""}`).join("\n"));
  await p.close();
}
await b.close();
