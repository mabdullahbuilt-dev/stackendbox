import http from "node:http";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const received = [];
let failNext = false;
const hook = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { if (failNext) { failNext = false; res.statusCode = 500; res.end("{}"); return; } received.push({ key: req.headers["api-key"], ...JSON.parse(b) }); res.statusCode = 201; res.end("{}"); }); }).listen(4010);
const srv = spawn("npx", ["next", "start", "-p", "3102"], { env: { ...process.env, BREVO_API_URL: "http://localhost:4010", BREVO_API_KEY: "xkeysib-local-test-key", BREVO_SENDER_EMAIL: "hello@stackendbox.com", BREVO_SENDER_NAME: "StackEndBox", BRIEF_TO_EMAIL: "hello@stackendbox.com" }, stdio: "ignore" });
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
const B = p.locator("#start");
// no wizard: the whole brief is on screen, plus email and call options
ok(await B.getByRole("button", { name: "Send Project Brief" }).isVisible(), "single-step brief with Send Project Brief");
ok(await B.locator("a[href='mailto:hello@stackendbox.com']").first().isVisible(), "email visible in the section");
ok(await B.getByRole("button", { name: "Book a Call" }).first().isVisible(), "Book a Call visible in the section");
// validation
await B.getByRole("button", { name: "Send Project Brief" }).click(); await p.waitForTimeout(400);
ok(await p.getByText("Tell us your name.").isVisible(), "field error shown for empty name");
// optional chips, no limit of three
for (const c of ["Web App", "AI", "Automation", "Web3 / Blockchain"]) await B.getByRole("button", { name: c, exact: true }).click();
ok((await B.locator(".choice[data-checked='true']").count()) === 4, "four optional chips can be selected");
await p.getByLabel("Name").fill("Test Person");
await p.getByLabel("Work email").fill("bad");
await B.getByRole("button", { name: "Send Project Brief" }).click(); await p.waitForTimeout(400);
ok(await p.getByText("That email doesn't look right.").isVisible(), "email error shown");
await p.getByLabel("Work email").fill("test@example.com");
await p.getByLabel("What do you need built?").fill("We have a spreadsheet mess and need a custom platform.");
// provider failure keeps everything and shows alternatives
failNext = true;
await B.getByRole("button", { name: "Send Project Brief" }).click();
await p.waitForSelector("[role=alert]", { timeout: 8000 });
ok(await p.getByLabel("What do you need built?").inputValue() === "We have a spreadsheet mess and need a custom platform.", "text kept after a delivery failure");
ok((await B.locator(".choice[data-checked='true']").count()) === 4, "chips kept after a delivery failure");
ok(await p.locator("[role=alert] a[href^='mailto:']").first().waitFor({ timeout: 4000 }).then(() => true, () => false), "email alternative shown with the error");
received.length = 0;
await B.getByRole("button", { name: "Send Project Brief" }).click();
await p.waitForSelector("text=Brief received.", { timeout: 8000 });
ok(true, "success state shown after retry");
await new Promise((r) => setTimeout(r, 300));
ok(received.length === 2, "two emails sent (team + visitor confirmation)");
ok(received[0]?.to?.[0]?.email === "hello@stackendbox.com" && received[0]?.replyTo?.email === "test@example.com", "team email to hello@ with visitor reply-to");
ok(/^New StackEndBox Project Brief: .*Web Application.*Web3 \/ Blockchain.* from Test Person$/.test(received[0]?.subject ?? ""), "team subject: " + received[0]?.subject);
ok(received[0]?.textContent?.includes("spreadsheet mess"), "team email has the brief text");
ok(received[1]?.to?.[0]?.email === "test@example.com" && received[1]?.subject === "We received your project brief", "visitor confirmation sent");
ok(received[0]?.key === "xkeysib-local-test-key", "api-key header sent server side only");
ok(!(await p.content()).includes("xkeysib"), "api key never present in page HTML");
// Cal.com: popup if the embed loads, otherwise a new tab fallback
const book = p.locator("#start").getByRole("button", { name: "Book a Call" }).first();
ok(await book.isVisible(), "Book a Call visible when NEXT_PUBLIC_CAL_URL is set");
const popupP = p.context().waitForEvent("page", { timeout: 9000 }).then(() => "new-tab", () => null);
await book.click();
const modal = p.locator("cal-modal-box, iframe[src*='cal.com']").first();
const res = await Promise.race([modal.waitFor({ timeout: 9000 }).then(() => "popup", () => null), popupP]);
ok(res === "popup" || res === "new-tab", "Cal.com opens (" + res + ")");
console.log("console errors:", errs.length ? errs : "none");
await b.close(); srv.kill(); hook.close();
