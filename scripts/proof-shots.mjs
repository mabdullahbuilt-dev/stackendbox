import { chromium } from "playwright-core";
const [w = "1440", h = "900", out = "/tmp/proof"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto("http://localhost:3100", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.querySelector(".dcar").scrollIntoView({ block: "center", behavior: "instant" }));
await p.waitForTimeout(1000);
for (let i = 0; i < 6; i++) {
  await p.waitForTimeout(6800);
  await p.screenshot({ path: `${out}-${i}.png` });
  await p.keyboard.press("Tab").catch(() => {});
  await p.focus(".dcar__track");
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(700);
}
await b.close();
