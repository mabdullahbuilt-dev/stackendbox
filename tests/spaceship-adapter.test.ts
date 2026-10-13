import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ env: () => "fixture-secret" }));
import { spaceship, spaceshipTest } from "@/lib/portal/spaceship";
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("registrar adapter mutation boundaries", () => {
  it("separates authentication from inventory-schema validity without returning domain or key values",async()=>{
    fetchMock.mockResolvedValue(new Response(JSON.stringify({items:[{name:"private-fixture.invalid"}],total:1})));
    const result=await spaceshipTest.connection();
    expect(result.connection).toBe("Connected");expect(result).toHaveProperty("inventory_schema_valid",false);
    expect(JSON.stringify(result)).not.toContain("private-fixture.invalid");expect(JSON.stringify(result)).not.toContain("fixture-secret");
  });
  it("blocks every personal-account write even when live flags are mistakenly enabled",async()=>{
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED","true");vi.stubEnv("DOMAIN_MUTATION_ALLOWLIST","example.com");
    for(const run of [()=>spaceshipTest.setContacts("example.com",{}),()=>spaceshipTest.saveContact("example.com",{}),()=>spaceshipTest.register("example.com",{}),()=>spaceshipTest.renew("example.com",{}),()=>spaceshipTest.saveDns("example.com",[]),()=>spaceshipTest.setNameservers("example.com",[]),()=>spaceshipTest.setPrivacy("example.com","high")]) await expect(run()).rejects.toThrow("personal_test_read_only");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps async acceptance pending and reads documented operation status",async()=>{
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED","true");vi.stubEnv("DOMAIN_MUTATION_ALLOWLIST","example.com");vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED","true");
    fetchMock.mockResolvedValueOnce(new Response(null,{status:202,headers:{"spaceship-async-operationid":"operation-fixture"}})).mockResolvedValueOnce(new Response(JSON.stringify({status:"pending"})));
    expect(await spaceship.renew("example.com",{years:1,currentExpirationDate:"2027-10-13T00:00:00Z"})).toEqual({operation_id:"operation-fixture",status:"pending"});
    expect(await spaceship.operation("operation-fixture")).toEqual({status:"pending"});
    expect(fetchMock.mock.calls[1][0]).toBe("https://spaceship.dev/api/v1/async-operations/operation-fixture");
  });
  it("reads only a valid official contact ID", async () => {
    await expect(spaceship.contact("../domains")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("blocks holder writes by default and preserves pending verification when enabled in a fixture", async () => {
    await expect(spaceship.setContacts("example.com", {registrant:"a".repeat(27)})).rejects.toThrow("live_domain_changes_disabled");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED", "true"); vi.stubEnv("DOMAIN_MUTATION_ALLOWLIST", "example.com");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({verificationStatus:"verification"})));
    expect(await spaceship.setContacts("example.com",{registrant:"a".repeat(27)})).toEqual({verificationStatus:"verification"});
    expect(fetchMock.mock.calls[0][0]).toBe("https://spaceship.dev/api/v1/domains/example.com/contacts");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({registrant:"a".repeat(27)});
  });
  it("blocks all writes before any provider call by default", async () => {
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED", "false");
    for (const run of [() => spaceship.saveDns("example.com", []), () => spaceship.deleteDns("example.com", []), () => spaceship.setNameservers("example.com", []), () => spaceship.setPrivacy("example.com", "high")]) await expect(run()).rejects.toThrow("live_domain_changes_disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never allows the corporate domain even when allowlisted", async () => {
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED", "true"); vi.stubEnv("DOMAIN_MUTATION_ALLOWLIST", "stackendbox.com");
    await expect(spaceship.saveDns("StackEndBox.COM", [])).rejects.toThrow("live_domain_changes_disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends non-forced DNS writes and strips TTL on delete", async () => {
    vi.stubEnv("DOMAIN_LIVE_MUTATIONS_ENABLED", "true"); vi.stubEnv("DOMAIN_MUTATION_ALLOWLIST", "example.com");
    fetchMock.mockImplementation(async () => new Response(null, {status:204}));
    const item = { type: "A", name: "@", address: "192.0.2.1", ttl: 300 };
    await spaceship.saveDns("example.com", [item]);
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({force:false,items:[item]});
    await spaceship.deleteDns("example.com", [item]);
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual([{type:"A",name:"@",address:"192.0.2.1"}]);
  });
  it("rejects oversized availability batches", async () => {
    await expect(spaceship.availabilityBatch(Array.from({length:21},(_,i)=>`example${i}.com`))).rejects.toThrow("invalid_availability_batch");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fails on truncated DNS pages instead of presenting incomplete state", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({items:[],total:1})));
    await expect(spaceship.dns("example.com")).rejects.toThrow("spaceship_incomplete_dns");
  });
  const inventoryDomain = (name:string) => ({name,autoRenew:false,isPremium:false,lifecycleStatus:"registered"});
  it("reads all domain pages with the documented take and skip parameters", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({items:Array.from({length:100},(_,i)=>inventoryDomain(`fixture${i}.invalid`)),total:101})))
      .mockResolvedValueOnce(new Response(JSON.stringify({items:[inventoryDomain("last.invalid")],total:101})));
    expect(await spaceship.inventory()).toHaveLength(101);
    expect(fetchMock.mock.calls.map(c=>c[0])).toEqual(["https://spaceship.dev/api/v1/domains?take=100&skip=0","https://spaceship.dev/api/v1/domains?take=100&skip=100"]);
  });
  it("accepts a provider-confirmed empty inventory without fabricating a domain", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({items:[],total:0})));
    expect(await spaceship.inventory()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts a missing administrative contact in provider reads without weakening contact writes", async () => {
    const item={...inventoryDomain("example.com"),contacts:{registrant:"a".repeat(27),admin:null,tech:null,billing:null,attributes:null}};
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({items:[item],total:1})));
    expect(await spaceshipTest.inventory()).toEqual([item]);
    await expect(spaceship.setContacts("example.com",item.contacts)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects duplicate domains and inconsistent totals", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({items:[inventoryDomain("same.invalid"),inventoryDomain("same.invalid")],total:2})));
    await expect(spaceship.inventory()).rejects.toThrow("spaceship_duplicate_inventory");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({items:[inventoryDomain("one.invalid")],total:0})));
    await expect(spaceship.inventory()).rejects.toThrow("spaceship_incomplete_inventory");
  });
  it("fails closed when the inventory changes between pages", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({items:[inventoryDomain("one.invalid")],total:2})))
      .mockResolvedValueOnce(new Response(JSON.stringify({items:[inventoryDomain("two.invalid")],total:3})));
    await expect(spaceship.inventory()).rejects.toThrow("spaceship_inventory_changed_retry");
  });
});
