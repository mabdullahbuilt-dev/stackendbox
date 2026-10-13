import {afterEach,expect,it,vi} from "vitest";
import {approvedAcceptanceRecord,dnsAcceptanceGrant,oneAssignedClient} from "@/lib/portal/dns-acceptance-grant";
afterEach(()=>vi.unstubAllEnvs());
const actor="00000000-0000-4000-8000-000000000001",record={type:"TXT",name:"_acceptance",value:"verified-fixture",ttl:300};
const grant={domain:"fixture.example",actor_id:actor,name:record.name,value:record.value,ttl:300,expires_at:"2099-01-01T00:00:00.000Z"};
it("handles PostgREST unique one-to-one relationships without inventing multiple assignments",()=>{
  expect(oneAssignedClient({client_id:actor})).toBe(actor);expect(oneAssignedClient([{client_id:actor}])).toBe(actor);
  for(const invalid of [null,[],[{client_id:actor},{client_id:actor}],{client_id:"invalid"}])expect(oneAssignedClient(invalid)).toBeNull();
});
it("allows only the exact approved record, domain and actor",()=>{
  vi.stubEnv("DOMAIN_ACCEPTANCE_GRANT",JSON.stringify(grant));
  expect(dnsAcceptanceGrant("fixture.example",actor).name).toBe(record.name);
  expect(approvedAcceptanceRecord("fixture.example",record)).toEqual(record);
  for(const changed of [{...record,name:"_dmarc"},{...record,type:"MX"},{...record,value:"other"},{...record,ttl:600},{...record,force:true}])expect(()=>approvedAcceptanceRecord("fixture.example",changed)).toThrow();
  expect(()=>dnsAcceptanceGrant("other.example",actor)).toThrow();expect(()=>dnsAcceptanceGrant("fixture.example","00000000-0000-4000-8000-000000000002")).toThrow();
});
it("fails closed for missing, malformed, expired or corporate approval",()=>{
  for(const value of ["","invalid",JSON.stringify({...grant,expires_at:"2020-01-01T00:00:00.000Z"}),JSON.stringify({...grant,domain:"stackendbox.com"})]){vi.stubEnv("DOMAIN_ACCEPTANCE_GRANT",value);expect(()=>dnsAcceptanceGrant(value.includes("stackendbox.com")?"stackendbox.com":"fixture.example",actor)).toThrow();}
});
