import {beforeEach,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({from:vi.fn(),update:vi.fn(),eq:vi.fn(),select:vi.fn(),read:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:state.from}),audit:state.audit,checkDb:(error:unknown)=>{if(error)throw Error("database unavailable");}}));
vi.mock("@/lib/portal/auth-email",()=>({sendAuthEmail:vi.fn()}));
import {changeClientSignIn} from "@/lib/portal/client-operations";
const owner="11111111-1111-4111-8111-111111111111",client="22222222-2222-4222-8222-222222222222";
beforeEach(()=>{vi.clearAllMocks();const chain={update:state.update,eq:state.eq,select:state.select,maybeSingle:state.read};state.from.mockReturnValue(chain);state.update.mockReturnValue(chain);state.eq.mockReturnValue(chain);state.select.mockReturnValue(chain);});
it("cannot change the current owner or inject a role",async()=>{
  await expect(changeClientSignIn(owner,{user_id:owner,active:false})).rejects.toMatchObject({code:"cannot_disable_current_admin"});
  await expect(changeClientSignIn(owner,{user_id:client,active:false,role:"super_admin"})).rejects.toThrow();expect(state.from).not.toHaveBeenCalled();
});
it("filters the durable update to client identities and records actual success",async()=>{
  state.read.mockResolvedValue({data:{user_id:client},error:null});await changeClientSignIn(owner,{user_id:client,active:false});
  expect(state.eq).toHaveBeenCalledWith("role","client");expect(state.eq).toHaveBeenCalledWith("user_id",client);expect(state.update).toHaveBeenCalledWith({active:false});expect(state.audit).toHaveBeenCalledWith(owner,"account_access_changed",client,{active:false});
});
it("doesn't claim success when an owner, staff or missing identity wasn't changed",async()=>{
  state.read.mockResolvedValue({data:null,error:null});await expect(changeClientSignIn(owner,{user_id:client,active:false})).rejects.toMatchObject({code:"client_identity_required"});expect(state.audit).not.toHaveBeenCalled();
});
