import {expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({filters:[] as unknown[],detail:{name:"fixture.invalid",contacts:{registrant:"private-contact"},customerId:"private-account",autoRenew:false,nameservers:{provider:"custom",hosts:[]}},result:{id:"operation",status:"review_required",updated_at:"now"}}));
vi.mock("@/lib/portal/server",()=>({rateLimit:vi.fn(),checkDb:(e:unknown)=>{if(e)throw e;},adminDb:()=>({from:()=>{const q={select:()=>q,eq:(key:string,value:unknown)=>{state.filters.push([key,value]);return q;},maybeSingle:async()=>({data:state.result,error:null})};return q;}})}));
vi.mock("@/lib/portal/authoritative-dns",()=>({authoritativeNameservers:async()=>[]}));
vi.mock("@/lib/portal/spaceship",()=>({spaceship:{detail:async()=>state.detail},mutationAllowed:()=>{throw Error("disabled");}}));
import {readDomainState,clientDomainState,domainOperationStatus} from "@/lib/portal/domain-operations";
import type {identity} from "@/lib/portal/server";
it("rejects a mismatched provider domain before exposing the response",async()=>{
 await expect(readDomainState("different.invalid")).rejects.toThrow("registrar_domain_mismatch");
});
it("keeps provider contact IDs and account metadata outside the client response",async()=>{
 const result=clientDomainState(await readDomainState("fixture.invalid"));
 expect(result.detail.autoRenew).toBe(false);expect(result.changesEnabled).toBe(false);
 expect(JSON.stringify(result)).not.toContain("private-contact");expect(JSON.stringify(result)).not.toContain("private-account");
 expect(result.detail).not.toHaveProperty("nameservers");
});
it("checks assignment and actor before returning only operation status",async()=>{
 const auth={user:{id:"actor"},db:{from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==="portal_domains"?{id:"domain",name:"fixture.invalid",protected:false}:{client_id:"client"},error:null})})})})}} as unknown as Awaited<ReturnType<typeof identity>>;
 const key="11111111-1111-4111-8111-111111111111";
 expect(await domainOperationStatus("fixture.invalid",key,auth)).toEqual({operation_id:"operation",status:"review_required",updated_at:"now"});
 expect(state.filters).toContainEqual(["domain_id","domain"]);expect(state.filters).toContainEqual(["actor_id","actor"]);expect(state.filters).toContainEqual(["idempotency_key",key]);
});
