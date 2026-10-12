import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ active: true, owned: true, failed: false, insert: vi.fn(), filters: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/portal/server", () => ({
  audit: mock.audit,
  checkDb: (error: unknown) => { if (error) throw new Error("database_unavailable"); },
  adminDb: () => ({ from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: string) => { mock.filters(table, key, value); return chain; },
      maybeSingle: async () => ({ data: (table === "portal_clients" ? mock.active : mock.owned) ? { id: "verified" } : null, error: mock.failed ? {} : null }),
      insert: mock.insert,
    };
    return chain;
  } }),
}));
import { assignService, assignWebsite, websiteAssignmentSchema } from "@/lib/portal/website-assignments";
const client = "00000000-0000-4000-8000-000000000001";
const website = "00000000-0000-4000-8000-000000000002";
const service = { client_id: client, website_id: website, service: "Maintenance", description: "Authorized fixture only", status: "included" };
beforeEach(() => { vi.clearAllMocks(); mock.active = true; mock.owned = true; mock.failed = false; mock.insert.mockResolvedValue({ error: null }); });
describe("website and service assignment boundaries", () => {
  it("normalizes safe HTTPS URLs", () => {
    expect(websiteAssignmentSchema.parse({ client_id: client, name: " Test ", url: "https://example.com" })).toMatchObject({ name: "Test", url: "https://example.com/" });
  });
  it.each(["http://example.com", "https://user:secret@example.com"])("rejects unsafe URL %s", url => {
    expect(() => websiteAssignmentSchema.parse({ client_id: client, name: "Test", url })).toThrow();
  });
  it("rejects unrecognized fields", () => {
    expect(websiteAssignmentSchema.safeParse({ client_id: client, name: "Test", url: "https://example.com", status: "live" }).success).toBe(false);
  });
  it("does not assign a website to a suspended or missing client", async () => {
    mock.active = false;
    await expect(assignWebsite("actor", { client_id: client, name: "Test", url: "https://example.com" })).rejects.toThrow("active_client_required");
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("rejects a service linked to another client's website", async () => {
    mock.owned = false;
    await expect(assignService("actor", service)).rejects.toThrow("website_client_mismatch");
    expect(mock.filters).toHaveBeenCalledWith("portal_websites", "client_id", client);
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("fails closed on database read errors", async () => {
    mock.failed = true;
    await expect(assignService("actor", service)).rejects.toThrow("database_unavailable");
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("saves verified service ownership and audit evidence", async () => {
    await expect(assignService("actor", service)).resolves.toEqual({ message: "Agreed service saved." });
    expect(mock.insert).toHaveBeenCalledWith({ ...service, created_by: "actor" });
    expect(mock.audit).toHaveBeenCalledWith("actor", "service_entitlement_added", client);
  });
  it("saves a validated website and audit evidence", async () => {
    await assignWebsite("actor", { client_id: client, name: "Test", url: "https://example.com" });
    expect(mock.insert).toHaveBeenCalledWith({ client_id: client, name: "Test", url: "https://example.com/" });
    expect(mock.audit).toHaveBeenCalledWith("actor", "website_added", client);
  });
});
