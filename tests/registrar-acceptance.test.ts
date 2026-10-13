import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {z} from "zod";

vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({rateLimit:vi.fn()}));
vi.mock("@/lib/portal/authoritative-dns",()=>({authoritativeNameservers:vi.fn().mockResolvedValue(["ns1.example.com"])}));
vi.mock("@/lib/portal/spaceship",()=>({spaceshipTest:{inventory:vi.fn(),detail:vi.fn(),contact:vi.fn(),dns:vi.fn()}}));

import {registrarAcceptance} from "@/lib/portal/registrar-acceptance";
import {spaceshipTest} from "@/lib/portal/spaceship";
import {PortalError} from "@/lib/portal/rules";

const provider=vi.mocked(spaceshipTest);
const domain={name:"example.com",autoRenew:false,isPremium:false,lifecycleStatus:"registered",contacts:{registrant:"a".repeat(27)},nameservers:{provider:"custom",hosts:["ns1.example.com"]}};
const malformed=()=>{try{z.object({name:z.string()}).parse({name:42});}catch(error){return error;}throw new Error("expected fixture parse failure");};

beforeEach(()=>{
  vi.stubEnv("SPACESHIP_TEST_DOMAIN","example.com");
  provider.inventory.mockReset().mockResolvedValue([domain]);
  provider.detail.mockReset().mockResolvedValue(domain);
  provider.contact.mockReset().mockResolvedValue({firstName:"Fixture",lastName:"Owner",email:"fixture@example.invalid",address1:"1 Example St",city:"Example",country:"US",phone:"+1.123456789"});
  provider.dns.mockReset().mockResolvedValue({items:[],total:0});
});
afterEach(()=>vi.unstubAllEnvs());

describe("isolated registrar acceptance",()=>{
  it.each(["detail","contact","dns"] as const)("classifies malformed %s response without exposing provider values",async stage=>{
    provider[stage].mockRejectedValueOnce(malformed());
    await expect(registrarAcceptance("example.com")).rejects.toMatchObject({code:`personal_${stage}_schema_name`,status:502});
  });
  it("reads only the authorized domain and never enumerates other personal domains",async()=>{
    const result=await registrarAcceptance("example.com");
    expect(result.domain).toBe("example.com");
    expect(provider.detail).toHaveBeenCalledWith("example.com");
    expect(provider.inventory).not.toHaveBeenCalled();
  });
  it("reports an account-scoped 404 as an unowned test domain",async()=>{
    provider.detail.mockRejectedValueOnce(new PortalError("spaceship_404",502));
    await expect(registrarAcceptance("example.com")).rejects.toMatchObject({code:"test_domain_not_in_account",status:409});
  });
  it("rejects an unapproved domain before any provider read",async()=>{
    await expect(registrarAcceptance("other.example")).rejects.toMatchObject({code:"exact_test_domain_authorization_required",status:409});
    expect(provider.inventory).not.toHaveBeenCalled();
  });
});
