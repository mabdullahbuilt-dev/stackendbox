import {expect,it} from "vitest";
import {verifiedRenewalExpiration} from "../lib/portal/domain-snapshot";
const current={name:"fixture.example",lifecycleStatus:"registered",autoRenew:false,expirationDate:"2027-10-13T00:00:00Z"};
const now=Date.parse("2026-10-14T00:00:00Z");
it("requires matching provider identity and a verified future expiration",()=>{
  expect(verifiedRenewalExpiration(current.name,current,undefined,now)).toBe(current.expirationDate);
  expect(()=>verifiedRenewalExpiration("other.example",current,undefined,now)).toThrow("registrar_domain_mismatch");
  for(const expirationDate of [null,"invalid","2025-01-01T00:00:00Z"])expect(()=>verifiedRenewalExpiration(current.name,{...current,expirationDate},undefined,now)).toThrow();
});
it("blocks changed expiration, auto-renew and inactive registrar state without any mutation",()=>{
  expect(()=>verifiedRenewalExpiration(current.name,current,"2027-10-14T00:00:00Z",now)).toThrow();
  expect(()=>verifiedRenewalExpiration(current.name,{...current,autoRenew:true},undefined,now)).toThrow();
  expect(()=>verifiedRenewalExpiration(current.name,{...current,lifecycleStatus:"expired"},undefined,now)).toThrow();
});
