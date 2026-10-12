import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ env: () => "fixture-secret" }));
import { spaceship } from "@/lib/portal/spaceship";
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("registrar adapter mutation boundaries", () => {
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
