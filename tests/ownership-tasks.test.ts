import {beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({prior:null as Record<string,unknown>|null,protected:false,rpc:vi.fn(),read:vi.fn(),calls:[] as string[]}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({rpc:state.rpc,from:(name:string)=>{const chain={select:(fields:string)=>{state.calls.push(fields);return chain;},eq:()=>chain,order:()=>chain,in:()=>chain,limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:name==="portal_domains"?{protected:state.protected}:state.prior,error:null})};return chain;}}),checkDb:(error:unknown)=>{if(error)throw Error("database_failed");}}));
vi.mock("@/lib/portal/registrant",()=>({readRegistrant:state.read}));
import {createOwnershipTask,progressOwnershipTask,ownershipTasks,ownershipTaskSchema,ownershipProgressSchema} from "../lib/portal/ownership-tasks";
const id="aaaaaaaa-0000-4000-8000-000000000001",task="aaaaaaaa-0000-4000-8000-000000000002";
const input={idempotency_key:id,domain:"fixture.example",kind:"registered_holder",request_reference:"Approved request fixture"};
beforeEach(()=>{vi.clearAllMocks();state.calls=[];state.prior=null;state.protected=false;state.rpc.mockResolvedValue({data:{id},error:null});state.read.mockResolvedValue({contact_id:"official-contact-id",lifecycle_status:"registered",expiration_date:"2027-10-13",verification_status:"success",nameservers:["ns.fixture.example"],custody:"Dedicated account",checked_at:"2026-10-14",holder:"Private holder name",contact:{email:"private@example.invalid"}});});
it("saves a registrar-verified review baseline without private contact details or provider writes",async()=>{
  await createOwnershipTask("admin",input);
  expect(state.read).toHaveBeenCalledWith("fixture.example");
  expect(state.rpc).toHaveBeenCalledWith("portal_create_ownership_task",expect.objectContaining({p_domain:input.domain,p_kind:input.kind,p_baseline:expect.objectContaining({contact_id:"official-contact-id"})}));
  expect(JSON.stringify(state.rpc.mock.calls)).not.toContain("Private holder name");expect(JSON.stringify(state.rpc.mock.calls)).not.toContain("private@example.invalid");
});
it("reuses an identical creation without another provider read",async()=>{
  state.prior={id,created_by:"admin",domain:input.domain,kind:input.kind,request_reference:input.request_reference};
  await createOwnershipTask("admin",input);expect(state.read).not.toHaveBeenCalled();expect(state.rpc).not.toHaveBeenCalled();
});
it("rejects request ID reuse by another actor or for a different operation",async()=>{
  state.prior={created_by:"another-admin",domain:input.domain,kind:input.kind,request_reference:input.request_reference};
  await expect(createOwnershipTask("admin",input)).rejects.toMatchObject({code:"idempotency_conflict"});expect(state.read).not.toHaveBeenCalled();
});
it("blocks company and protected domains before contacting the provider",async()=>{
  await expect(createOwnershipTask("admin",{...input,domain:"stackendbox.com"})).rejects.toThrow();
  state.protected=true;await expect(createOwnershipTask("admin",input)).rejects.toThrow();expect(state.read).not.toHaveBeenCalled();
});
it("rejects unregistered provider responses without saving a task",async()=>{
  state.read.mockResolvedValue({lifecycle_status:"pending",expiration_date:null});await expect(createOwnershipTask("admin",input)).rejects.toMatchObject({code:"domain_registration_unverified"});expect(state.rpc).not.toHaveBeenCalled();
});
it("requires explicit consent evidence when recording consent",async()=>{
  const progress={idempotency_key:id,task_id:task,expected_revision:0,status:"consent_recorded",evidence_reference:"Secure evidence reference"};
  await expect(progressOwnershipTask("admin",progress)).rejects.toMatchObject({code:"ownership_consent_reference_required"});
  await progressOwnershipTask("admin",{...progress,consent_confirmed:true});expect(state.rpc).toHaveBeenCalledWith("portal_progress_ownership_task",expect.objectContaining({p_revision:0,p_status:"consent_recorded"}));
});
it("never accepts a manual legal-completion or verified stage",()=>{
  for(const status of ["verified","completed","ownership_transferred"])
    expect(ownershipProgressSchema.safeParse({idempotency_key:id,task_id:task,expected_revision:0,status,evidence_reference:"Reference"}).success).toBe(false);
  expect(ownershipTaskSchema.safeParse({...input,registrar_execution:true}).success).toBe(false);
});
it("returns safe actionable conflicts without exposing SQL or baseline data",async()=>{
  state.rpc.mockResolvedValueOnce({error:{code:"23505",message:"private SQL detail"}});
  await expect(createOwnershipTask("admin",input)).rejects.toMatchObject({code:"ownership_task_already_open",status:409});
  state.rpc.mockResolvedValueOnce({error:{code:"P0001",message:"Task changed, refresh before updating"}});
  await expect(progressOwnershipTask("admin",{idempotency_key:id,task_id:task,expected_revision:0,status:"review_required",evidence_reference:"Reference"})).rejects.toMatchObject({code:"ownership_task_changed",status:409});
});
it("returns staff task metadata separately from private baselines and never claims completion",async()=>{
  const result=await ownershipTasks();expect(result).toMatchObject({tasks:[],events:[],registrar_execution_enabled:false,legal_completion_available:false});
  expect(state.calls.join(" ")).not.toContain("baseline");expect(state.calls.join(" ")).not.toContain("*");
});
