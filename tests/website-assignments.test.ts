import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ active: true, owned: true, failed: false, prior:null as Record<string,unknown>|null, insert: vi.fn(), update:vi.fn(), filters: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/portal/server", () => ({
  audit: mock.audit,
  checkDb: (error: unknown) => { if (error) throw new Error("database_unavailable"); },
  adminDb: () => ({ from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: string) => { mock.filters(table, key, value); return chain; },
      maybeSingle: async () => ({ data: table!=="portal_clients"&&mock.prior?mock.prior:(table === "portal_clients" ? mock.active : mock.owned) ? { id: "verified" } : null, error: mock.failed ? {} : null }),
      insert: mock.insert,
      update:(value:unknown)=>{mock.update(table,value);return chain;},
    };
    return chain;
  } }),
}));
import { assignService, assignWebsite, websiteAssignmentSchema,editAssignedService,editAssignedWebsite,serviceEditSchema } from "@/lib/portal/website-assignments";
const client = "00000000-0000-4000-8000-000000000001";
const website = "00000000-0000-4000-8000-000000000002";
const service = { client_id: client, website_id: website, service: "Maintenance", description: "Authorized fixture only", status: "included" };
beforeEach(() => { vi.clearAllMocks(); mock.active = true; mock.owned = true; mock.failed = false;mock.prior=null; mock.insert.mockResolvedValue({ error: null }); });
describe("website and service assignment boundaries", () => {
  it("keeps website edits bound to both the record and current client",async()=>{
    await expect(editAssignedWebsite("actor",{id:website,client_id:client,name:"Test",url:"https://example.com"})).resolves.toEqual({message:"Website updated."});
    expect(mock.filters).toHaveBeenCalledWith("portal_websites","id",website);expect(mock.filters).toHaveBeenCalledWith("portal_websites","client_id",client);
    expect(mock.update).toHaveBeenCalledWith("portal_websites",{client_id:client,name:"Test",url:"https://example.com/"});
  });
  it("rejects an edit of a website outside the selected client",async()=>{
    mock.owned=false;
    await expect(editAssignedWebsite("actor",{id:website,client_id:client,name:"Test",url:"https://example.com"})).rejects.toThrow("website_not_found");
    expect(mock.audit).not.toHaveBeenCalled();
  });
  it("validates the linked website again during service edits",async()=>{
    mock.owned=false;
    await expect(editAssignedService("actor",{...service,id:website})).rejects.toThrow("website_client_mismatch");
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("supports clearing a service's optional website without changing its client",async()=>{
    await expect(editAssignedService("actor",{...service,id:website,website_id:null})).resolves.toEqual({message:"Service updated."});
    expect(mock.filters).toHaveBeenCalledWith("portal_service_entitlements","client_id",client);
    expect(mock.update).toHaveBeenCalledWith("portal_service_entitlements",{...service,website_id:null});
  });
  it("rejects privilege fields and unknown service edit states",()=>{
    expect(serviceEditSchema.safeParse({...service,id:website,created_by:"someone"}).success).toBe(false);
    expect(serviceEditSchema.safeParse({...service,id:website,status:"paid"}).success).toBe(false);
  });
  it("deduplicates the same normalized website request and doesn't repeat its audit",async()=>{
    const input={client_id:client,name:"Test",url:"https://example.com"};
    mock.prior={...input,url:"https://example.com/"};mock.insert.mockResolvedValue({error:{code:"23505"}});
    await expect(assignWebsite("actor",{...input,idempotency_key:website})).resolves.toEqual({message:"Website added."});
    expect(mock.insert).toHaveBeenCalledWith({...mock.prior,id:website});expect(mock.audit).not.toHaveBeenCalled();
  });
  it("rejects a retry key reused with another client's data",async()=>{
    mock.prior={client_id:"other",name:"Test",url:"https://example.com/"};mock.insert.mockResolvedValue({error:{code:"23505"}});
    await expect(assignWebsite("actor",{client_id:client,name:"Test",url:"https://example.com",idempotency_key:website})).rejects.toThrow("idempotency_conflict");
  });
  it("deduplicates service retries with the same owner and actor",async()=>{
    mock.prior={...service,created_by:"actor"};mock.insert.mockResolvedValue({error:{code:"23505"}});
    await expect(assignService("actor",{...service,idempotency_key:website})).resolves.toEqual({message:"Agreed service saved."});
    expect(mock.audit).not.toHaveBeenCalled();
  });
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
