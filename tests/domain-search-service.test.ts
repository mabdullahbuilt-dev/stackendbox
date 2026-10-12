import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ adminDb: vi.fn(), checkDb: (error: unknown) => { if(error) throw new Error("database"); }, rateLimit: vi.fn() }));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: {availabilityBatch: vi.fn()} }));
import { adminDb } from "@/lib/portal/server";
import { spaceship } from "@/lib/portal/spaceship";
import { searchDomains } from "@/lib/portal/search-service";
beforeEach(() => {
  const pricing = {eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({data:[],error:null})};
  vi.mocked(adminDb).mockReturnValue({from: (table: string) => ({select: () => table === "portal_settings" ? { single: async () => ({data:{allowed_tlds:[],max_supplier_minor:0,registration_minor:4500},error:null}) } : pricing})} as unknown as ReturnType<typeof adminDb>);
});
describe("real registrar response handling", () => {
  it("maps the provider taken status to unavailable", async () => {
    vi.mocked(spaceship.availabilityBatch).mockResolvedValue({domains:[{domain:"example.com",result:"taken",premiumPricing:[]}]});
    const result = await searchDomains("example");
    expect(result.primary.result).toBe("unavailable");
    expect(result.alternatives).toEqual([]);
  });
  it("shows only verified available alternatives and never invents a price", async () => {
    vi.mocked(spaceship.availabilityBatch).mockResolvedValue({domains:[{domain:"samplebrand.com",result:"available",premiumPricing:[]},{domain:"samplebrand.net",result:"available"},{domain:"samplebrand.org",result:"pending"}]});
    const result = await searchDomains("samplebrand");
    expect(result.primary.result).toBe("available");
    expect(result.primary.retail_minor).toBeNull();
    expect(result.alternatives.map(r=>r.name)).toEqual(["samplebrand.net"]);
  });
});
