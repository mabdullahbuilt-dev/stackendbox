import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { superAdmin, type Account } from "@/lib/portal/server";
import {requiresFreshAdminMfa} from "@/lib/portal/admin-action";
type Auth = NonNullable<Parameters<typeof superAdmin>[0]>;
function fixture(role: Account["role"], level: string, error: unknown = null) {
  const assurance = vi.fn().mockResolvedValue({ data: { currentLevel: level }, error });
  const auth = { account: {role}, db: {auth: {mfa: {getAuthenticatorAssuranceLevel: assurance}}} } as unknown as Auth;
  return {auth, assurance};
}
afterEach(() => vi.unstubAllEnvs());
describe("private administrator gate", () => {
  it("requires fresh MFA for durable activation while read-only preview and review retain ordinary admin MFA",()=>{
    expect(requiresFreshAdminMfa("admin/activate-domain-client","POST")).toBe(true);
    expect(requiresFreshAdminMfa("admin/domain-handoff-review","POST")).toBe(false);
    expect(requiresFreshAdminMfa("admin/domain-handoff-preview","POST")).toBe(false);
  });
  it.each(["client", "staff"] as const)("rejects %s before querying MFA", async role => {
    const {auth, assurance} = fixture(role, "aal2");
    await expect(superAdmin(auth)).rejects.toThrow("administrator_required");
    expect(assurance).not.toHaveBeenCalled();
  });
  it("requires MFA even when a legacy environment switch says false", async () => {
    vi.stubEnv("PORTAL_REQUIRE_ADMIN_MFA", "false");
    await expect(superAdmin(fixture("super_admin", "aal1").auth)).rejects.toThrow("administrator_mfa_required");
  });
  it("fails closed on assurance errors", async () => {
    await expect(superAdmin(fixture("super_admin", "aal2", new Error("transport")).auth)).rejects.toThrow("administrator_mfa_required");
  });
  it("accepts a verified super-admin without repeating identity lookups", async () => {
    const {auth, assurance} = fixture("super_admin", "aal2");
    expect(await superAdmin(auth)).toBe(auth);
    expect(assurance).toHaveBeenCalledTimes(1);
  });
  it.each([undefined,[],["totp"],[{method:"password",timestamp:Date.now()/1000}],[{method:"totp",timestamp:Date.now()/1000-601}],[{method:"totp",timestamp:Date.now()/1000+60}]])("rejects missing, stale or invalid MFA timestamps for handoff",async methods=>{
    const {auth,assurance}=fixture("super_admin","aal2");
    assurance.mockResolvedValue({data:{currentLevel:"aal2",currentAuthenticationMethods:methods},error:null});
    await expect(superAdmin(auth,true)).rejects.toThrow("administrator_fresh_mfa_required");
  });
  it.each(["totp","mfa/totp"])("accepts fresh %s verification",async method=>{
    const {auth,assurance}=fixture("super_admin","aal2");
    assurance.mockResolvedValue({data:{currentLevel:"aal2",currentAuthenticationMethods:[{method,timestamp:Date.now()/1000-30}]},error:null});
    expect(await superAdmin(auth,true)).toBe(auth);
  });
});
