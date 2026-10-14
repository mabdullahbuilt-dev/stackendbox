import {describe,expect,it} from "vitest";
import {clientColumns,clientDnsRecord,clientRow,customerErrorCode} from "@/lib/portal/client-response";
import {portalTables} from "@/lib/portal/data-scope";

describe("customer response contracts",()=>{
  it.each(portalTables)("does not expose unreviewed columns from %s",table=>{
    const result=clientRow(table,{supplier_minor:100,contact_ids:{registrant:"private"},provider_account:"private",audit_reason:"private",storage_path:"private",future_secret:"private"});
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result).not.toHaveProperty("supplier_minor");
    expect(clientColumns(table)).not.toContain("*");
  });
  it("keeps confirmed domain state but excludes nameservers and nested metadata",()=>{
    expect(clientRow("domains",{id:"d",name:"fixture.invalid",auto_renew:false,expiration_date:"2027-01-01",nameservers:{hosts:["private"]},security:{contact_ids:"private",eppStatuses:["clientTransferProhibited",{secret:"private"}],privacy:{level:"high",providerId:"private"}}})).toEqual({id:"d",name:"fixture.invalid",auto_renew:false,expiration_date:"2027-01-01",security:{eppStatuses:["clientTransferProhibited"],privacy:{level:"high"}}});
  });
  it("preserves exact DNS values without arbitrary provider payloads",()=>{
    expect(clientDnsRecord({type:"TXT",name:"@",ttl:300,value:"v=spf1 include:mail.example -all",group:{type:"custom",account:"private"},contact_id:"private"})).toEqual({type:"TXT",name:"@",ttl:300,value:"v=spf1 include:mail.example -all",group:{type:"custom"}});
    expect(clientDnsRecord({type:"UNKNOWN",name:"@",payload:{secret:"private"},group:{type:"provider-id"}})).toEqual({type:"UNKNOWN",name:"@",group:{type:"managed"}});
  });
  it("keeps provider errors out of customer responses",()=>{
    expect(customerErrorCode("spaceship_403")).toBe("domain_information_unavailable");
    expect(customerErrorCode("registrant_contact_unavailable")).toBe("domain_information_unavailable");
    expect(customerErrorCode("quote_expired")).toBe("quote_expired");
  });
});
