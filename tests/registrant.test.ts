import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: { detail: vi.fn(), contact: vi.fn() } }));
import { spaceship } from "@/lib/portal/spaceship";
import { readRegistrant, verifyAssignmentHolder } from "@/lib/portal/registrant";
const detail = { name: "example.com", autoRenew: false, isPremium: false, lifecycleStatus: "registered", expirationDate: "2027-10-13T00:00:00Z", verificationStatus: "success", contacts: { registrant: "a".repeat(27) } };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(spaceship.detail).mockResolvedValue(detail);
  vi.mocked(spaceship.contact).mockResolvedValue({ firstName: "Authorized", lastName: "Client", email: "fixture@example.com", address1: "1 Test Street", city: "Test City", country: "US", phone: "+1.123456789" });
});
describe("provider-backed holder evidence", () => {
  it("reads the domain's own official contact ID", async () => {
    const evidence = await readRegistrant("Example.COM");
    expect(evidence.holder).toBe("Authorized Client");
    expect(spaceship.contact).toHaveBeenCalledWith("a".repeat(27));
  });
  it("accepts normalized matching holder and rejects an invented name", async () => {
    await expect(verifyAssignmentHolder("example.com", "  authorized   CLIENT ")).resolves.toHaveProperty("holder", "Authorized Client");
    await expect(verifyAssignmentHolder("example.com", "Other Person")).rejects.toThrow("registered_holder_mismatch");
  });
  it("uses the provider organization when present", async () => {
    vi.mocked(spaceship.contact).mockResolvedValue({ firstName: "Staff", lastName: "Member", organization: "Client Company", email: "fixture@example.com", address1: "1 Test Street", city: "Test City", country: "US", phone: "+1.123456789" });
    await expect(verifyAssignmentHolder("example.com", "Client Company")).resolves.toHaveProperty("holder", "Client Company");
    await expect(verifyAssignmentHolder("example.com", "Staff Member")).rejects.toThrow("registered_holder_mismatch");
  });
  it("rejects missing contacts without requesting guessed IDs", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, contacts: undefined });
    await expect(readRegistrant("example.com")).rejects.toThrow("registrant_contact_unavailable");
    expect(spaceship.contact).not.toHaveBeenCalled();
  });
  it.each(["verification", "unknown", undefined])("blocks unconfirmed status %s", async (verificationStatus) => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, verificationStatus });
    await expect(verifyAssignmentHolder("example.com", "Authorized Client")).rejects.toThrow("registrant_verification_pending");
  });
  it("accepts explicitly reported null, not an absent verification field", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, verificationStatus: null });
    await expect(verifyAssignmentHolder("example.com", "Authorized Client")).resolves.toHaveProperty("verification_reported", true);
  });
  it("blocks suspended or mismatched domains", async () => {
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, suspensions: [{ reasonCode: "raaVerification" }] });
    await expect(verifyAssignmentHolder("example.com", "Authorized Client")).rejects.toThrow("domain_registration_unverified");
    vi.mocked(spaceship.detail).mockResolvedValue({ ...detail, name: "other.com" });
    await expect(readRegistrant("example.com")).rejects.toThrow("registrar_domain_mismatch");
  });
});
