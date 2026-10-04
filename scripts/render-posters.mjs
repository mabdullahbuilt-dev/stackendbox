// Renders the hero object to transparent PNG posters via the /poster tool route.
// Usage: POSTER_TOOL=1 next start & node scripts/render-posters.mjs http://localhost:3000
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const jobs = [
  ["stack-assembled", 0],
  ["stack-exploded", 0.35],
];
for (const [name, e] of jobs) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  await page.goto(`${base}/poster?e=${e}`);
  await page.addStyleTag({ content: "html,body,main,#__next,[data-poster]{background:transparent!important}" });
  await page.waitForSelector('[data-done="true"]', { timeout: 60000 });
  await page.screenshot({ path: `public/hero/${name}.png`, omitBackground: true });
  console.log("wrote", name);
  await page.close();
}
await browser.close();
