import { chromium } from "playwright-core";
const [url, js, w = "1440", h = "900"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "networkidle" });
console.log(JSON.stringify(await p.evaluate(js), null, 1));
await b.close();
