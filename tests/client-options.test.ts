import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({calls:[] as unknown[],rows:[] as unknown[]}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:(table:string)=>{state.calls.push(table);const query={select:(fields:string)=>{state.calls.push(fields);return query;},eq:(name:string,value:unknown)=>{state.calls.push([name,value]);return query;},limit:async()=>({data:state.rows,error:null})};return query;}}),checkDb:(error:unknown)=>{if(error)throw error;}}));
import {clientOptions} from "@/lib/portal/admin-data";
describe("minimal active client selection",()=>{
  it("returns approved identities without loading assets or provisioning records",async()=>{
    state.calls=[];state.rows=[{client_id:"fixture",portal_clients:{name:"Client",business_name:"Business"},portal_accounts:{approved_email:"approved@example.test"}}];
    expect(await clientOptions()).toEqual({clients:[{client_id:"fixture",name:"Client",business_name:"Business",email:"approved@example.test"}]});
    expect(state.calls).toContainEqual(["portal_accounts.role","client"]);
    expect(state.calls).toContainEqual(["portal_accounts.active",true]);
    expect(state.calls).toContainEqual(["portal_clients.status","active"]);
    expect(state.calls).not.toContain("portal_provisioning");
  });
});
