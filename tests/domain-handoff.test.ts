import {beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({records:{} as Record<string,unknown>,rpc:vi.fn(),importDomain:vi.fn(),notifyClient:vi.fn(),provisionClient:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:(name:string)=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:state.records[name]??null,error:null}),single:async()=>({data:state.records[name]??null,error:null})};return chain;},rpc:state.rpc}),audit:state.audit,checkDb:(error:unknown)=>{if(error)throw Error("database_failed");}}));
vi.mock("@/lib/portal/services",()=>({importDomain:state.importDomain,notifyClient:state.notifyClient}));
vi.mock("@/lib/portal/provisioning",()=>({provisionClient:state.provisionClient}));
vi.mock("@/lib/portal/registrant",()=>({verifyPortalAssignment:async()=>({holder:"Verified agency holder"})}));
import {activateDomainClient} from "../lib/portal/domain-handoff";
const input={idempotency_key:"aaaaaaaa-0000-4000-8000-000000000001",domain:"example.net",email:"client@example.test",name:"Test Client",initial_password:"fixture-password-only",holder_arrangement:"licensed",rights_confirmed:true};
beforeEach(()=>{vi.clearAllMocks();state.records={};state.rpc.mockResolvedValue({error:null});state.importDomain.mockResolvedValue({domain:{id:"verified-domain",name:"example.net",lifecycle_status:"registered",expiration_date:"2027-10-13"}});});
it("passes a new client to durable password provisioning without a purchase or invoice",async()=>{
  await activateDomainClient("admin",input);
  expect(state.provisionClient).toHaveBeenCalledWith("admin",expect.objectContaining({credential_mode:"initial_password",temporary_password:input.initial_password,domain_id:"verified-domain"}));
  expect(state.rpc).not.toHaveBeenCalled();
});
it("links an existing client without changing their password or Auth identity",async()=>{
  state.records.portal_accounts={user_id:"existing-user",role:"client",active:true};
  state.records.portal_memberships={client_id:"existing-client",portal_clients:{status:"active"}};
  const result=await activateDomainClient("admin",input);
  expect(result.client_id).toBe("existing-client");
  expect(state.provisionClient).not.toHaveBeenCalled();
  expect(state.rpc).toHaveBeenCalledWith("portal_assign_verified_domain",expect.objectContaining({p_client:"existing-client",p_holder:"Verified agency holder"}));
});
it("blocks another client's assignment before creating a new identity",async()=>{
  state.records.portal_domain_assignments={client_id:"someone-else"};
  await expect(activateDomainClient("admin",input)).rejects.toMatchObject({code:"domain_already_assigned"});
  expect(state.provisionClient).not.toHaveBeenCalled();
});
it("rejects corporate domains before contacting the registrar",async()=>{
  await expect(activateDomainClient("admin",{...input,domain:"stackendbox.com"})).rejects.toThrow();
  expect(state.importDomain).not.toHaveBeenCalled();
});
it("never adopts an administrator identity as a client",async()=>{
  state.records.portal_accounts={user_id:"admin-user",role:"super_admin",active:true};
  await expect(activateDomainClient("admin",input)).rejects.toMatchObject({code:"existing_account_requires_review"});
  expect(state.provisionClient).not.toHaveBeenCalled();expect(state.rpc).not.toHaveBeenCalled();
});
