import {beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({calls:[] as {table:string;method:string;args:unknown[]}[],results:{} as Record<string,unknown[]>}));
vi.mock("@/lib/portal/server",()=>({checkDb:(error:unknown)=>{if(error)throw Error("database_error");},adminDb:()=>({from:(table:string)=>{
  const builder:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:state.results[table]||[],count:3,error:null}).then(resolve)};
  for(const method of ["select","eq","gt","gte","lt","lte","in","not","neq","or","ilike","like","order","limit"])builder[method]=(...args:unknown[])=>{state.calls.push({table,method,args});return builder;};
  return builder;
}})}));
import {clientDirectory,clientOptions,operationalHealth} from "../lib/portal/admin-data";
import {operationsData,operationsSummary} from "../lib/portal/operations-data";
import {renewalMonitor} from "../lib/portal/renewal-monitor";
beforeEach(()=>{state.calls=[];state.results={};});
it("includes bounded service-payment records in operations without customer or provider payloads",async()=>{
 const result=await operationsData();expect(result.invoice_payments).toEqual([]);
 const selected=state.calls.find(call=>call.table==="portal_invoice_payments"&&call.method==="select");expect(selected?.args[0]).toContain("invoice_id,client_id,provider_id,status,environment");
 expect(state.calls).toContainEqual({table:"portal_invoice_payments",method:"limit",args:[50]});expect(String(selected?.args[0])).not.toContain("*");
});
it("prefills client-profile handoffs through one authorized UUID lookup instead of putting email in the URL",async()=>{
  const id="11111111-1111-4111-8111-111111111111";
  await clientOptions(id);
  expect(state.calls).toContainEqual({table:"portal_memberships",method:"eq",args:["client_id",id]});
  expect(state.calls).toContainEqual({table:"portal_memberships",method:"eq",args:["portal_accounts.role","client"]});
  await expect(clientOptions("invalid-id")).rejects.toThrow();
});
it("loads the overview with count-only queries and no client or message payloads",async()=>{
  const result=await operationsSummary();
  expect(result.counts).toEqual({active_clients:3,assigned_domains:3,expires_30_days:3,unpaid_invoices:3,open_support:3,operation_reviews:3});
  expect(state.calls.filter(call=>call.method==="select")).toHaveLength(6);
  for(const call of state.calls.filter(call=>call.method==="select"))expect(call.args[1]).toEqual({count:"exact",head:true});
  expect(state.calls.some(call=>["auth.users","portal_messages","portal_email_outbox"].includes(call.table))).toBe(false);
  expect(result.scope).toBe("customers");
  expect(state.calls.filter(call=>call.method==="not"&&call.args[1]==="ilike")).toHaveLength(6);
});
it("counts labelled test accounts separately instead of mixing them into customer totals",async()=>{
  expect((await operationsSummary("test")).scope).toBe("test");
  expect(state.calls.filter(call=>call.method==="ilike"&&call.args[1]==="TEST ONLY %")).toHaveLength(6);
});
it("keeps customer and test scopes on directory and renewal drill-down queries",async()=>{
  await clientDirectory(undefined,"",undefined,"customers");
  expect(state.calls).toContainEqual({table:"portal_clients",method:"not",args:["business_name","ilike","TEST ONLY %"]});
  expect(state.calls).toContainEqual({table:"portal_provisioning",method:"not",args:["input->>business_name","ilike","TEST ONLY %"]});
  state.calls=[];
  await renewalMonitor(undefined,"test");
  expect(state.calls).toContainEqual({table:"portal_domains",method:"ilike",args:["portal_domain_assignments.portal_clients.business_name","TEST ONLY %"]});
  expect(state.calls.find(call=>call.table==="portal_domains"&&call.method==="select")?.args[0]).toContain("portal_domain_assignments!inner");
});
it("paginates renewal domains and scopes saved history without exposing email payloads",async()=>{
  state.results.portal_domains=Array.from({length:51},(_,i)=>({id:String(i),name:`fixture${i}.invalid`,portal_domain_assignments:[{client_id:"client"}]}));
  state.results.portal_email_outbox=[{id:"mail",dedupe_key:"renewal:fixture0.invalid:expiry:30:private@example.invalid",status:"accepted"}];
  const result=await renewalMonitor();
  expect(result.domains).toHaveLength(50);expect(result.next).toBe("49");
  expect(result.reminders).toEqual([{id:"mail",status:"accepted",domain:"fixture0.invalid"}]);
  expect(JSON.stringify(result)).not.toContain("private@example.invalid");
  expect(state.calls).toContainEqual({table:"portal_domains",method:"eq",args:["protected",false]});
  expect(state.calls).toContainEqual({table:"portal_orders",method:"eq",args:["kind","renewal"]});
  await expect(renewalMonitor("bad-cursor")).rejects.toThrow();
});
it("excludes backup custody locations and arbitrary detail from health responses",async()=>{
  state.results.portal_backup_runs=[{id:"fixture",detail:{offsite:true,objects:0,checksum_readback_verified:true,drive_generation:"private-folder",unexpected:"sensitive"}}];
  const result=await operationalHealth();
  expect(result.backups[0].detail).toEqual({offsite:true,objects:0,checksum_readback_verified:true});
  expect(JSON.stringify(result)).not.toContain("private-folder");
  expect(state.calls).toContainEqual({table:"portal_backup_runs",method:"select",args:["id,kind,status,started_at,completed_at,includes_auth,includes_objects,detail"]});
});
it("searches identities and domains with an explicit client page limit",async()=>{
  await clientDirectory(undefined,'test%,(name).*');
  expect(state.calls).toContainEqual({table:"portal_memberships",method:"ilike",args:["portal_accounts.approved_email","%test\\%,(name).*%"]});
  expect(state.calls).toContainEqual({table:"portal_clients",method:"limit",args:[51]});
  expect(state.calls).toContainEqual({table:"portal_clients",method:"in",args:["id",["00000000-0000-0000-0000-000000000000"]]});
});
it("scopes a profile and its provisioning history to the same validated ID",async()=>{
  const id="11111111-1111-4111-8111-111111111111";
  await clientDirectory(undefined,"",id);
  expect(state.calls).toContainEqual({table:"portal_clients",method:"eq",args:["id",id]});
  expect(state.calls).toContainEqual({table:"portal_provisioning",method:"eq",args:["client_id",id]});
  await expect(clientDirectory(undefined,"","arbitrary-filter")).rejects.toThrow();
});
it("doesn't hide search matches beyond its explicit ceiling",async()=>{
  state.results.portal_clients=Array.from({length:501},(_,i)=>({id:String(i)}));
  await expect(clientDirectory(undefined,"example")).rejects.toThrow("client_search_too_broad");
});
it("returns exact counts separately from capped exception lists and excludes private payloads",async()=>{
  const result=await operationsData();
  expect(result.counts.active_clients).toBe(3);
  expect(result.counts.expires_1_days).toBe(3);
  expect(state.calls).toContainEqual({table:"portal_domains",method:"limit",args:[100]});
  const sensitive=state.calls.filter(c=>["portal_email_outbox","portal_domain_operations"].includes(c.table)&&c.method==="select"&&!(c.args[1] as {head?:boolean})?.head);
  for(const call of sensitive){expect(call.args[0]).not.toBe("*");expect(call.args[0]).not.toContain("body");expect(call.args[0]).not.toContain("input");}
});
it("uses exact database-backed notification and operation-review counts",async()=>{
  const result=await operationsData();
  expect(result.counts.email_delivery_issues).toBe(3);expect(result.counts.pending_renewals).toBe(3);expect(result.counts.domain_operation_reviews).toBe(3);
  expect(state.calls).toContainEqual({table:"portal_email_outbox",method:"in",args:["status",["review_required","failed","bounced","deferred"]]});
});
