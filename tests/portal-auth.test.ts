import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));

vi.mock("@/lib/portal/server", () => ({
  adminDb: vi.fn(), audit: vi.fn(), checkDb: vi.fn(), clientAccess: vi.fn(),
  identity: vi.fn(), originCheck: vi.fn(), portalOrigin: vi.fn(),
  rateLimit: vi.fn(), sessionDb: vi.fn(), superAdmin: vi.fn(), turnstile: vi.fn(),
}));
vi.mock("@/lib/portal/services", () => ({
  availability: vi.fn(), createQuote: vi.fn(), notifyClient: vi.fn(),
  syncDomains: vi.fn(), validateQuote: vi.fn(), runJobs: vi.fn(),
}));
vi.mock("@/lib/portal/whop", () => ({ checkout: vi.fn() }));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: vi.fn() }));
vi.mock("@/lib/portal/search-service", () => ({ searchDomains: vi.fn() }));
vi.mock("@/lib/portal/domain-operations", () => ({ authorizedDomain: vi.fn(), changeDomain: vi.fn(), readDomainState: vi.fn() }));
vi.mock("@/lib/portal/auth-email", () => ({ sendAuthEmail: vi.fn() }));

import { GET, POST } from "@/app/api/portal/[...path]/route";
import { identity, sessionDb, superAdmin, turnstile } from "@/lib/portal/server";
import { PortalError } from "@/lib/portal/rules";

describe("authentication verification errors", () => {
  for (const action of ["login", "recover"]) {
    it.each([undefined, "", "   ", null])(
      `${action} explains a missing verification token (%s)`,
      async (token) => {
        const response = await POST(
          new NextRequest(`https://portal.example/api/portal/auth/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "test@example.com", password: "fixture", token }),
          }),
          { params: Promise.resolve({ path: ["auth", action] }) },
        );
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "verification_required" });
        expect(sessionDb).not.toHaveBeenCalled();
        expect(turnstile).not.toHaveBeenCalled();
      },
    );
  }
});

it("returns empty client data for an unassigned administrator without querying tenant tables", async () => {
  const from = vi.fn(() => ({ select: () => ({ eq: async () => ({data:[],error:null}) }) }));
  vi.mocked(identity).mockResolvedValue({
    user:{id:"fixture"}, account:{user_id:"fixture",role:"super_admin"},
    db:{from,auth:{mfa:{listFactors:async()=>({data:{totp:[]},error:null})}}},
  } as unknown as Awaited<ReturnType<typeof identity>>);
  const response = await GET(new NextRequest("https://portal.example/api/portal/data"), {params:Promise.resolve({path:["data"]})});
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.domains).toEqual([]);
  expect(data.clients).toEqual([]);
  expect(data.invoices).toEqual([]);
  expect(from.mock.calls).toEqual([["portal_memberships"]]);
});

describe("client acquisition restrictions",()=>{
  it.each(["availability","domain-search","admin/domain-search","admin/acquisitions","admin/import-domain"])("denies a client posting to %s",async route=>{
    vi.mocked(identity).mockResolvedValue({user:{id:"fixture"},account:{role:"client"},db:{}} as unknown as Awaited<ReturnType<typeof identity>>);
    vi.mocked(superAdmin).mockRejectedValue(new PortalError("administrator_required",403));
    const response=await POST(new NextRequest(`https://portal.example/api/portal/${route}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:"example",domain:"example.com"})}),{params:Promise.resolve({path:route.split("/")})});
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({error:"administrator_required"});
  });
});
