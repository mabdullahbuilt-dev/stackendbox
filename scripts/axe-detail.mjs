import { chromium } from "playwright-core";
import fs from "node:fs";
const [w = "1440", h = "900", url = "http://localhost:3100"] = process.argv.slice(2);
const axeSrc = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.evaluate(axeSrc);
const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ["color-contrast"] })).violations.flatMap((v) => v.nodes.map((n) => ({ t: n.target.join(" ").slice(-70), d: n.any[0]?.data ? `${n.any[0].data.fgColor} on ${n.any[0].data.bgColor} ${n.any[0].data.contrastRatio} (${n.any[0].data.fontSize})` : "" }))));
const seen = new Set();
for (const x of r) { const k = x.d; if (seen.has(k)) continue; seen.add(k); console.log(x.d, "|", x.t); }
await b.close();
