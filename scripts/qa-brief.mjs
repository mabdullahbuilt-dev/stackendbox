// Contact form UX: validation, double submit, preserved content on failure, friendly errors, success reset.
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://localhost:3100/";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let fails = 0; const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails++; };
for (const vp of [{ width: 1366, height: 768, tag: "desktop" }, { width: 390, height: 844, tag: "phone" }]) {
  const p = await b.newPage({ viewport: vp });
  let mode = "ok", calls = 0, last = null;
  await p.route("**/api/brief", async (r) => { calls++; last = JSON.parse(r.request().postData()); await new Promise((s) => setTimeout(s, 400));
    if (mode === "net") return r.abort(); if (mode === "502") return r.fulfill({ status: 502, contentType: "application/json", body: '{"ok":false,"error":"delivery_failed"}' });
    return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
  await p.goto(URL + "#start"); await p.waitForTimeout(800);
  const f = p.locator("#start form");
  const fill = async (email) => { await f.locator('input[name=name]').fill("Ada Lovelace"); await f.locator('input[name=email]').fill(email); await f.locator('textarea[name=context]').fill("A client portal with billing."); };
  const send = f.locator('button[type=submit]');
  // invalid email + empty required
  await f.locator('input[name=email]').fill("not-an-email"); await send.click(); await p.waitForTimeout(200);
  ok(calls === 0 && (await f.locator(".field__err").count()) >= 2, `${vp.tag}: blank name / invalid email blocked client-side, no request`);
  for (const email of ["name@gmail.com", "name@outlook.com"]) { await fill(email); mode = "502"; await send.click(); await p.waitForTimeout(700);
    ok(last?.email === email, `${vp.tag}: ${email} accepted and sent`); }
  // provider failure: friendly message, content kept
  const err = await p.locator("#start .ct__err").innerText();
  ok(/couldn't send the brief/.test(err) && !/delivery_failed|502/.test(err), `${vp.tag}: provider failure shows friendly error`);
  ok((await f.locator('textarea[name=context]').inputValue()) === "A client portal with billing.", `${vp.tag}: content preserved after failure`);
  await p.locator("#start .ct").screenshot({ path: `/tmp/claude-0/brief-error-${vp.tag}.png` });
  mode = "net"; await send.click(); await p.waitForTimeout(700);
  ok(/connection/.test(await p.locator("#start .ct__err").innerText()), `${vp.tag}: network failure shows connection hint`);
  // double submit + sending state + success
  await fill("ada@company.com"); mode = "ok"; calls = 0;
  await send.dblclick(); await p.waitForTimeout(100);
  ok(/Sending brief/.test(await send.innerText()) && await send.isDisabled(), `${vp.tag}: sending state shown and button disabled`);
  await p.waitForTimeout(900);
  ok(calls === 1, `${vp.tag}: double click sends exactly one request (${calls})`);
  ok(/Brief sent/.test(await p.locator("#start .ct__done").innerText()), `${vp.tag}: success state`);
  await p.locator("#start .ct").screenshot({ path: `/tmp/claude-0/brief-done-${vp.tag}.png` });
  await p.getByRole("button", { name: "Send another brief" }).click();
  ok((await f.locator('textarea[name=context]').inputValue()) === "", `${vp.tag}: form cleared after success`);
  await p.close();
}
await b.close(); console.log(fails ? `FAILED ${fails}` : "ALL PASSED"); process.exit(fails ? 1 : 0);
