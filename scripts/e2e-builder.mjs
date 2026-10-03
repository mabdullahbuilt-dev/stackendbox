import http from "node:http";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const received = [];
const hook = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { received.push(JSON.parse(b)); res.end("ok"); }); }).listen(4010);
const srv = spawn("npx", ["next", "start", "-p", "3102"], { env: { ...process.env, BRIEF_WEBHOOK_URL: "http://localhost:4010" }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 4500));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3102/#start", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await p.evaluate(() => document.getElementById("start").scrollIntoView());
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
// validation gate
await p.click(".builder__next");
ok(await p.locator('[role="alert"]').first().isVisible(), "Continue blocked with no selection + alert shown");
// Q1 via keyboard: tab to a checkbox and press space
const B = p.locator("#start");
await B.getByText("Automation", { exact: true }).click();
await B.getByText("CRM", { exact: true }).click();
ok((await p.locator(".bstage__top .mono.tnum").innerText()).includes("6"), "stage shows modules after selection: " + (await p.locator(".bstage__top .mono.tnum").innerText()));
await p.click(".builder__next"); await p.waitForTimeout(500);
ok(await p.locator("legend", { hasText: "Where are you now?" }).isVisible(), "step 2 visible");
await B.getByText("Manual workflow", { exact: true }).click();
await p.click(".builder__next"); await p.waitForTimeout(500);
await B.getByText("Automate", { exact: true }).click();
await p.click(".builder__next"); await p.waitForTimeout(500);
ok(await B.getByText("YOUR STARTING BRIEF").isVisible(), "brief card shown");
await p.getByRole("button", { name: "Discuss This Project" }).click(); await p.waitForTimeout(500);
// invalid submit
await p.getByRole("button", { name: "Send brief" }).click();
ok(await p.getByText("Tell us your name.").isVisible(), "field error shown for empty name");
await p.getByLabel("Name").fill("Test Person");
await p.getByLabel("Work email").fill("bad");
await p.getByRole("button", { name: "Send brief" }).click();
ok(await p.getByText("That email doesn't look right.").isVisible(), "email error shown");
await p.getByLabel("Work email").fill("test@example.com");
await p.getByLabel("Anything we should know?").fill("We have a spreadsheet mess.");
await p.getByRole("button", { name: "Send brief" }).click();
await p.waitForSelector("text=Brief received.", { timeout: 8000 });
ok(true, "success state shown");
await new Promise((r) => setTimeout(r, 300));
ok(received.length === 1 && received[0].text.includes("Need: Automation, CRM") && received[0].text.includes("test@example.com"), "webhook received brief: " + JSON.stringify(received[0]?.text?.split("\n").slice(0, 6)));
console.log("console errors:", errs.length ? errs : "none");
await b.close(); srv.kill(); hook.close();
