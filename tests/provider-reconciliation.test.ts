import {afterEach,beforeEach,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({rpc:vi.fn(),update:vi.fn(),detail:vi.fn(),save:vi.fn(),notify:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({rpc:state.rpc,from:()=>({update:state.update})}),checkDb:(error:unknown)=>{if(error)throw error;},rateLimit:vi.fn(),audit:state.audit}));
vi.mock("@/lib/portal/spaceship",()=>({spaceship:{detail:state.detail}}));
vi.mock("@/lib/portal/services",()=>({saveVerifiedDomain:state.save,notifyClient:state.notify}));
import {reconcileAssignedDomains} from "@/lib/portal/provider-reconciliation";
beforeEach(()=>{vi.clearAllMocks();state.rpc.mockResolvedValue({data:[{id:"fixture-id",name:"fixture.example",auto_renew:false}],error:null});state.update.mockReturnValue({eq:vi.fn(async()=>({error:null}))});state.detail.mockResolvedValue({name:"fixture.example",autoRenew:false,expirationDate:"2027-01-01T00:00:00Z"});});
afterEach(()=>vi.restoreAllMocks());
it("refreshes a bounded, explicitly scoped batch without provider writes",async()=>{
  expect(await reconcileAssignedDomains(["client-fixture"])).toEqual({checked:1,verified:1,failed:0});
  expect(state.rpc).toHaveBeenCalledWith("portal_claim_provider_checks",{client_ids:["client-fixture"]});
  expect(state.save).toHaveBeenCalledOnce();expect(state.notify).not.toHaveBeenCalled();
  expect(state.update.mock.calls[0][0]).toHaveProperty("next_provider_check_at");
});
it("keeps verified data intact and backs off a failed provider check",async()=>{
  state.detail.mockRejectedValueOnce(Error("provider unavailable"));
  expect(await reconcileAssignedDomains()).toEqual({checked:1,verified:0,failed:1});
  expect(state.save).not.toHaveBeenCalled();expect(state.update.mock.calls[0][0]).toEqual(expect.objectContaining({reconciliation_required:true}));
  expect(state.update.mock.calls[0][0]).not.toHaveProperty("expiration_date");expect(state.notify).not.toHaveBeenCalled();
});
it("rejects provider domain mismatch and oversized claims",async()=>{
  state.detail.mockResolvedValueOnce({name:"other.example",autoRenew:false});await reconcileAssignedDomains();expect(state.save).not.toHaveBeenCalled();
  state.rpc.mockResolvedValueOnce({data:Array.from({length:5},()=>({})),error:null});await expect(reconcileAssignedDomains()).rejects.toThrow("provider_check_batch_invalid");
});
