import {afterEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>{throw Error("database must not be reached");}}));
import {GET} from "@/app/api/release-readiness/route";
afterEach(()=>vi.unstubAllEnvs());
describe("temporary production readiness boundary",()=>{
  it("does not expose configuration without the temporary token",async()=>{
    vi.stubEnv("VERCEL_ENV","production");vi.stubEnv("PORTAL_RELEASE_CHECK_TOKEN","");
    expect((await GET(new Request("https://example.test/api/release-readiness"))).status).toBe(404);
  });
  it("rejects incorrect tokens before inspecting secrets or the database",async()=>{
    vi.stubEnv("VERCEL_ENV","production");vi.stubEnv("PORTAL_RELEASE_CHECK_TOKEN","correct");
    expect((await GET(new Request("https://example.test/api/release-readiness",{headers:{authorization:"Bearer invalid"}}))).status).toBe(404);
  });
});
