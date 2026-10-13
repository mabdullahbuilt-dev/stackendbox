import { afterEach, describe, expect, it, vi } from "vitest";
import { cookies, withRequest, after } from "../platform/edge/next-runtime";
import gateway from "../platform/cloudflare/gateway";
import { acceptanceConfiguration, productionConfiguration } from "../platform/edge/configuration";

afterEach(() => vi.unstubAllGlobals());
describe("static frontend server boundary", () => {
  it("requires main-domain origin and a dedicated credential for production email scheduling",()=>{
    const values:Record<string,string>={STACKENDBOX_ACCEPTANCE_CRON_SECRET:"acceptance-fixture",STACKENDBOX_ACCEPTANCE_PORTAL_JOBS_ENABLED:"true",STACKENDBOX_ACCEPTANCE_PORTAL_JOB_CLIENT_ALLOWLIST:"acceptance-client"};
    const read=(name:string)=>values[name];
    expect(productionConfiguration({},read).PORTAL_JOBS_ENABLED).toBe("false");
    expect(productionConfiguration({},read).CRON_SECRET).toBe("");
    values.STACKENDBOX_PRODUCTION_PORTAL_JOBS_ENABLED="true";
    expect(productionConfiguration({},read).PORTAL_JOBS_ENABLED).toBe("false");
    values.STACKENDBOX_PRODUCTION_CRON_SECRET="x".repeat(32);
    expect(productionConfiguration({},read).PORTAL_JOBS_ENABLED).toBe("true");
    expect(productionConfiguration({},read).PORTAL_JOB_CLIENT_ALLOWLIST).toBe("");
    expect(productionConfiguration({},read).DOMAIN_LIVE_RENEWALS_ENABLED).toBe("false");
    values.STACKENDBOX_PRODUCTION_TEST_ORIGIN="https://stackendbox-production.stackendbox.workers.dev";
    expect(productionConfiguration({},read).PORTAL_JOBS_ENABLED).toBe("false");
  });
  it("allows only the owned temporary production origin before cutover",()=>{
    const get=(value:string)=>(name:string)=>name==="STACKENDBOX_PRODUCTION_TEST_ORIGIN"?value:undefined;
    expect(productionConfiguration({},get("https://stackendbox-production.stackendbox.workers.dev")).PORTAL_APP_URL).toBe("https://stackendbox-production.stackendbox.workers.dev");
    expect(productionConfiguration({},get("https://attacker.example")).PORTAL_APP_URL).toBe("https://www.stackendbox.com");
  });
  it("prepares main-domain origin without enabling diagnostics, payments or registrar changes",()=>{
    const values:Record<string,string>={STACKENDBOX_ACCEPTANCE_BREVO_API_KEY:"public",STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_API_KEY:"portal"};
    const config=productionConfiguration({PORTAL_DIAGNOSTICS_TOKEN:"fixture",DOMAIN_LIVE_RENEWALS_ENABLED:"true",PORTAL_JOBS_ENABLED:"true"},name=>values[name]);
    expect(config.PORTAL_APP_URL).toBe("https://www.stackendbox.com");
    expect(config.BREVO_API_KEY).toBe("public");expect(config.BREVO_CLIENT_API_KEY).toBe("portal");
    expect(config.PORTAL_DIAGNOSTICS_TOKEN).toBe("");expect(config.PORTAL_JOBS_ENABLED).toBe("false");
    expect(config.DOMAIN_LIVE_RENEWALS_ENABLED).toBe("false");expect(config.PORTAL_SANDBOX_CHECKOUT_ENABLED).toBe("false");
  });
  it("keeps public and portal Brevo credentials and identities independent", () => {
    const values: Record<string, string> = {
      STACKENDBOX_ACCEPTANCE_BREVO_API_KEY: "public-fixture",
      STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_API_KEY: "portal-fixture",
      STACKENDBOX_ACCEPTANCE_BREVO_SENDER_EMAIL: "public@example.test",
      STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_SENDER_EMAIL: "portal@example.test",
      STACKENDBOX_ACCEPTANCE_BRIEF_TO_EMAIL: "business@example.test",
    };
    const config = acceptanceConfiguration({}, name => values[name]);
    expect(config.BREVO_API_KEY).toBe("public-fixture");
    expect(config.BREVO_CLIENT_API_KEY).toBe("portal-fixture");
    expect(config.BREVO_SENDER_EMAIL).toBe("public@example.test");
    expect(config.BREVO_CLIENT_SENDER_EMAIL).toBe("portal@example.test");
    expect(config.BRIEF_TO_EMAIL).toBe("business@example.test");
    const publicOnly = acceptanceConfiguration({}, name => name === "STACKENDBOX_ACCEPTANCE_BREVO_API_KEY" ? "public-fixture" : undefined);
    expect(publicOnly.BREVO_CLIENT_API_KEY).toBeUndefined();
    const portalOnly = acceptanceConfiguration({}, name => name === "STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_API_KEY" ? "portal-fixture" : undefined);
    expect(portalOnly.BREVO_API_KEY).toBeUndefined();
  });
  it("uses only acceptance-scoped credential overrides and preserves bridge settings", () => {
    const values: Record<string,string> = {
      STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_SENDER_EMAIL: "verified@example.test",
      STACKENDBOX_ACCEPTANCE_DOMAIN_LIVE_MUTATIONS_ENABLED: "true",
      STACKENDBOX_ACCEPTANCE_STACKENDBOX_BRIDGE_SECRET: "attacker",
    };
    const config = acceptanceConfiguration({STACKENDBOX_BRIDGE_SECRET:"existing",BREVO_CLIENT_API_KEY:"preserved"}, name=>values[name]);
    expect(config.BREVO_CLIENT_SENDER_EMAIL).toBe("verified@example.test");
    expect(config.BREVO_CLIENT_API_KEY).toBe("preserved");
    expect(config.STACKENDBOX_BRIDGE_SECRET).toBe("existing");
    expect(config.DOMAIN_LIVE_MUTATIONS_ENABLED).toBe("false");
    expect(Object.isFrozen(config)).toBe(true);
  });
  it("preserves an existing reply-to and avoids placeholder email credentials", () => {
    const get=()=>undefined;
    const existing=acceptanceConfiguration({BREVO_CLIENT_REPLY_TO:"approved@example.test",BREVO_CLIENT_SENDER_EMAIL:"sender@example.test",BREVO_API_KEY:"existing"},get);
    expect(existing.BREVO_CLIENT_REPLY_TO).toBe("approved@example.test");
    expect(existing.BREVO_API_KEY).toBe("existing");
    const incomplete=acceptanceConfiguration({BREVO_CLIENT_REPLY_TO:"placeholder",BREVO_CLIENT_SENDER_EMAIL:"sender@example.test",BREVO_API_KEY:"placeholder",BREVO_CLIENT_API_KEY:"fixture"},get);
    expect(incomplete.BREVO_CLIENT_REPLY_TO).toBe("sender@example.test");
    expect(incomplete.BREVO_API_KEY).toBe("placeholder");
  });
  it("never dispatches disabled scheduled jobs", async () => {
    const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
    await gateway.scheduled({}, {EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-acceptance",STACKENDBOX_BRIDGE_SECRET:"fixture",PORTAL_JOBS_ENABLED:"false",ASSETS:{fetch:vi.fn()}});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("pins scheduled jobs to the backend region and generates reminders only on the daily tick", async () => {
    const fetcher=vi.fn(async(_input: string | URL | Request, _init?: RequestInit)=>Response.json({emailsAccepted:0}));vi.stubGlobal("fetch",fetcher);
    const env={EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-acceptance",EDGE_BACKEND_REGION:"ap-northeast-1",STACKENDBOX_BRIDGE_SECRET:"fixture",CRON_SECRET:"fixture",PORTAL_JOBS_ENABLED:"true",ASSETS:{fetch:vi.fn()}};
    await gateway.scheduled({cron:"*/10 * * * *"},env);
    expect(new URL(fetcher.mock.calls[0][0] as unknown as string).searchParams.get("reminders")).toBe("false");
    expect((fetcher.mock.calls[0][1] as unknown as {headers:Record<string,string>}).headers["x-region"]).toBe("ap-northeast-1");
    await gateway.scheduled({cron:"0 0 * * *"},env);
    expect(new URL(fetcher.mock.calls[1][0] as unknown as string).searchParams.get("reminders")).toBe("true");
  });
  it("does not treat a disabled backend as a completed scheduled run", async () => {
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({status:"disabled"})));
    await expect(gateway.scheduled({}, {EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-acceptance",STACKENDBOX_BRIDGE_SECRET:"fixture",CRON_SECRET:"fixture",PORTAL_JOBS_ENABLED:"true",ASSETS:{fetch:vi.fn()}})).rejects.toThrow("scheduled_job_not_completed");
  });
  it("isolates parallel sessions and preserves secure response cookies", async () => {
    const run = (value: string) => withRequest(new Request("https://example.test/api", { headers: { cookie: `session=${value}` } }), async () => {
      const jar = await cookies();
      await new Promise(resolve => setTimeout(resolve, value === "one" ? 8 : 1));
      expect(jar.getAll()).toEqual([{ name: "session", value }]);
      jar.set("session", value + "-refreshed", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
      return Response.json({ ok: true });
    });
    const [one, two] = await Promise.all([run("one"), run("two")]);
    expect(one.headers.get("set-cookie")).toContain("session=one-refreshed");
    expect(two.headers.get("set-cookie")).toContain("session=two-refreshed");
    expect(one.headers.get("set-cookie")).toContain("HttpOnly");
    expect(one.headers.get("set-cookie")).toContain("Secure");
    expect(one.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not leak errors and registers deferred tasks", async () => {
    const wait = vi.fn();
    const job = vi.fn(async () => {});
    const response = await withRequest(new Request("https://example.test/api"), async () => { after(job); throw Error("secret"); }, wait);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(wait).toHaveBeenCalledOnce();
    expect(job).toHaveBeenCalledOnce();
  });
  it("serves presentation without calling a backend", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const assets = vi.fn(async () => new Response("static"));
    expect(await (await gateway.fetch(new Request("https://example.test/admin/billing"), { ASSETS: { fetch: assets }, EDGE_BACKEND_URL: "", STACKENDBOX_BRIDGE_SECRET: "" })).text()).toBe("static");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves raw webhook body and cookies, replacing caller bridge headers", async () => {
    const fetch = vi.fn(async (_url, init) => {
      expect(init.headers.get("x-stackendbox-bridge")).toBe("private-key");
      expect(init.headers.get("x-forwarded-for")).toBe("192.0.2.1");
      expect(await new Response(init.body).text()).toBe('{"signed":"unchanged"}');
      expect(init.redirect).toBe("manual");
      return new Response("ok", { headers: { "set-cookie": "session=refreshed; HttpOnly; Secure" } });
    }); vi.stubGlobal("fetch", fetch);
    const response = await gateway.fetch(new Request("https://example.test/api/webhooks/whop", { method: "POST", body: '{"signed":"unchanged"}', headers: { "x-stackendbox-bridge": "attacker", "cf-connecting-ip": "192.0.2.1" } }), { EDGE_BACKEND_URL: "https://project.supabase.co/functions/v1/stackendbox-acceptance", STACKENDBOX_BRIDGE_SECRET: "private-key", ASSETS: { fetch: vi.fn() } });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("fails closed when gateway configuration is missing", async () => {
    const response = await gateway.fetch(new Request("https://example.test/api/portal/admin/clients"), { EDGE_BACKEND_URL: "", STACKENDBOX_BRIDGE_SECRET: "", ASSETS: { fetch: vi.fn() } });
    expect(response.status).toBe(503);
  });
});
