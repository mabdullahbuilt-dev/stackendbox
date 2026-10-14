import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: { detail: vi.fn(), contact: vi.fn() } }));
import { spaceship } from "@/lib/portal/spaceship";
import { readRegistrant, verifyPortalAssignment } from "@/lib/portal/registrant";
const detail = { name: "example.com", autoRenew: false, isPremium: false, lifecycleStatus: "registered", expirationDate: "2027-10-13T00:00:00Z", verificationStatus: "success", contacts: { registrant: "a".repeat(27) } };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(spaceship.detail).mockResolvedValue(detail);
  vi.mocked(spaceship.contact).mockResolvedValue({ firstName: "Authorized", lastName: "Client", email: "fixture@example.com", address1: "1 Test Street", city: "Test City", country: "US", phone: "+1.123456789" });
});
describe("provider-backed holder evidence", () => {
  it("rejects a malformed expiry rather than displaying it as verified",async()=>{
    vi.mocked(spaceship.detail).mockResolvedValue({...detail,expirationDate:"invalid"});
    await expect(readRegistrant("example.com")).rejects.toThrow("registrar_expiration_unverified");
  });
  it("reads the domain's own official contact ID", async () => {
    const evidence = await readRegistrant("Example.COM");
    expect(evidence.holder).toBe("Authorized Client");
    expect(spaceship.contact).toHaveBeenCalledWith("a".repeat(27));
  });
  it("grants management independently of client identity and retains the actual holder", async () => {
    await expect(verifyPortalAssignment("example.com")).resolves.toHaveProperty("holder", "Authorized Client");
  });
  it("uses the provider organization when present", async () => {
    vi.mocked(spaceship.contact).mockResolvedValue({ firstName: "Staff", lastName: "Member", organization: "Client Company", email: "fixture@example.com", address1: "1 Test Street", city: "Test City", country: "US", phone: "+1.123456789" });
    await expect(verifyPortalAssignment("example.com")).resolves.toHaveProperty("holder", "Client Company");
  });
  it("rejects missing contacts without requesting guessed IDs", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, contacts: undefined });
    await expect(readRegistrant("example.com")).rejects.toThrow("registrant_contact_unavailable");
    expect(spaceship.contact).not.toHaveBeenCalled();
  });
  it.each(["verification", "unknown", undefined])("keeps verification %s separate from portal access", async (verificationStatus) => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, verificationStatus });
    await expect(verifyPortalAssignment("example.com")).resolves.toHaveProperty("verification_status", verificationStatus ?? null);
  });
  it("accepts explicitly reported null, not an absent verification field", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, verificationStatus: null });
    await expect(verifyPortalAssignment("example.com")).resolves.toHaveProperty("verification_reported", true);
  });
  it("blocks suspended or mismatched domains", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, suspensions: [{ reasonCode: "raaVerification" }] });
    await expect(verifyPortalAssignment("example.com")).rejects.toThrow("domain_registration_unverified");
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, name: "other.com" });
    await expect(readRegistrant("example.com")).rejects.toThrow("registrar_domain_mismatch");
  });
});
