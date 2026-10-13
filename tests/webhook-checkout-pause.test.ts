import {afterEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("next/server",()=>({after:vi.fn(),NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}}));
vi.mock("@/lib/portal/whop",()=>({processWebhook:vi.fn(async()=>({status:"duplicate"}))}));
vi.mock("@/lib/portal/services",()=>({runJobs:vi.fn()}));
import {POST} from "../app/api/webhooks/whop/route";
import {processWebhook} from "../lib/portal/whop";
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it("still verifies existing payment events while new checkouts are paused",async()=>{
  vi.stubEnv("WHOP_MODE","sandbox");vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED","false");
  vi.stubEnv("DOMAIN_LIVE_PURCHASES_ENABLED","false");vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED","false");
  vi.stubEnv("PORTAL_JOBS_ENABLED","false");
  const response=await POST(new Request("https://example.test/api/webhooks/whop",{method:"POST",body:'{"fixture":true}'}));
  expect(response.status).toBe(200);expect(processWebhook).toHaveBeenCalledOnce();
});
it("rejects live mode before processing any event",async()=>{
  vi.stubEnv("WHOP_MODE","live");
  expect((await POST(new Request("https://example.test/api/webhooks/whop",{method:"POST",body:"{}"}))).status).toBe(503);
  expect(processWebhook).not.toHaveBeenCalled();
});
