import {beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({calls:[] as {table:string;method:string;args:unknown[]}[],results:{} as Record<string,unknown[]>}));
vi.mock("@/lib/portal/server",()=>({checkDb:(error:unknown)=>{if(error)throw Error("database_error");},adminDb:()=>({from:(table:string)=>{
  const builder:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:state.results[table]||[],count:3,error:null}).then(resolve)};
  for(const method of ["select","eq","gt","gte","lt","lte","in","not","neq","or","ilike","order","limit"])builder[method]=(...args:unknown[])=>{state.calls.push({table,method,args});return builder;};
  return builder;
}})}));
import {clientDirectory,operationalHealth} from "../lib/portal/admin-data";
import {operationsData} from "../lib/portal/operations-data";
beforeEach(()=>{state.calls=[];state.results={};});
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
  const sensitive=state.calls.filter(c=>["portal_email_outbox","portal_domain_operations"].includes(c.table)&&c.method==="select");
  for(const call of sensitive){expect(call.args[0]).not.toBe("*");expect(call.args[0]).not.toContain("body");expect(call.args[0]).not.toContain("input");}
});
