import {beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({records:{} as Record<string,unknown>,rpc:vi.fn(),importDomain:vi.fn(),notifyClient:vi.fn(),provisionClient:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:(name:string)=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:state.records[name]??null,error:null}),single:async()=>({data:state.records[name]??null,error:null})};return chain;},rpc:state.rpc}),audit:state.audit,checkDb:(error:unknown)=>{if(error)throw Error("database_failed");}}));
vi.mock("@/lib/portal/services",()=>({importDomain:state.importDomain,notifyClient:state.notifyClient}));
vi.mock("@/lib/portal/provisioning",()=>({provisionClient:state.provisionClient}));
vi.mock("@/lib/portal/registrant",()=>({verifyPortalAssignment:async()=>({holder:"Verified agency holder"})}));
import {activateDomainClient,previewDomainHandoff} from "../lib/portal/domain-handoff";
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
  expect(state.rpc).toHaveBeenCalledWith("portal_commit_domain_handoff",expect.objectContaining({p_id:input.idempotency_key,p_client:"existing-client",p_email:input.email,p_holder:"Verified agency holder"}));
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
it("supports invitation onboarding without forwarding a password",async()=>{
  await activateDomainClient("admin",{...input,account_mode:"new",credential_mode:"invitation",initial_password:undefined});
  expect(state.provisionClient).toHaveBeenCalledWith("admin",expect.objectContaining({credential_mode:"invitation"}));
  expect(state.provisionClient.mock.calls[0][1]).not.toHaveProperty("temporary_password");
});
it("preview performs no import, provisioning, assignment, audit or notification",async()=>{
  const result=await previewDomainHandoff({domain:input.domain,email:input.email,account_mode:"new"});
  expect(result.domain).toBe(input.domain);
  for(const method of [state.importDomain,state.provisionClient,state.rpc,state.audit,state.notifyClient])expect(method).not.toHaveBeenCalled();
});
it("does not silently replace an existing identity in new-client mode",async()=>{
  state.records.portal_accounts={user_id:"existing-user",role:"client",active:true};
  await expect(previewDomainHandoff({domain:input.domain,email:input.email,account_mode:"new"})).rejects.toMatchObject({code:"client_email_already_exists_select_existing"});
});
it("rejects a stale or mismatched client selection",async()=>{
  state.records.portal_accounts={user_id:"existing-user",role:"client",active:true};
  state.records.portal_memberships={client_id:"different-client",portal_clients:{status:"active"}};
  await expect(previewDomainHandoff({domain:input.domain,email:input.email,account_mode:"existing",client_id:input.idempotency_key})).rejects.toMatchObject({code:"client_selection_changed"});
});
it("recovers a new-client request whose account was already created",async()=>{
  state.records.portal_provisioning={actor_id:"admin",email:input.email,input:{domain_id:"verified-domain"}};
  state.records.portal_accounts={user_id:"existing-user",role:"client",active:true};
  await activateDomainClient("admin",{...input,account_mode:"new"});
  expect(state.provisionClient).toHaveBeenCalledTimes(1);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("rejects reuse of another administrator's provisioning request",async()=>{
  state.records.portal_provisioning={actor_id:"other",email:input.email,input:{domain_id:"verified-domain"}};
  await expect(activateDomainClient("admin",{...input,account_mode:"new"})).rejects.toMatchObject({code:"idempotency_conflict"});
  expect(state.provisionClient).not.toHaveBeenCalled();
});
