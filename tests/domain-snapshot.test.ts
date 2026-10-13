import {describe,it,expect} from "vitest";
import {requireVerifiedExpiration} from "@/lib/portal/domain-snapshot";
describe("verified registrar expiration snapshots",()=>{
  it("rejects incomplete registered snapshots before any database write",()=>{
    for(const value of [undefined,null,"","not-a-date"])
      expect(()=>requireVerifiedExpiration("registered",value)).toThrow("registrar_expiration_unverified");
  });
  it("preserves the exact provider expiration instead of inventing one",()=>{
    expect(requireVerifiedExpiration("registered","2027-10-13T00:00:00Z")).toBe("2027-10-13T00:00:00Z");
    expect(requireVerifiedExpiration("pending",null)).toBeNull();
  });
});
