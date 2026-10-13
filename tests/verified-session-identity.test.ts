import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({getUser:vi.fn(),account:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({getAll:()=>[],set:vi.fn()})}));
vi.mock("@supabase/ssr",()=>({createServerClient:()=>db}));
const db={auth:{getUser:state.getUser},from:()=>({select:()=>({eq:()=>({maybeSingle:state.account})})})};
import {identity} from "@/lib/portal/server";
const user={id:"user",email:"approved@example.test"};
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","fixture");
  state.getUser.mockResolvedValue({data:{user},error:null});
  state.account.mockResolvedValue({data:{user_id:user.id,approved_email:user.email,active:true,role:"client"},error:null});
});
describe("server-verified session authorization",()=>{
  it("skips only redundant user verification and still reads the authorized account",async()=>{
    await identity({db,user} as unknown as Parameters<typeof identity>[0]);
    expect(state.getUser).not.toHaveBeenCalled();expect(state.account).toHaveBeenCalledOnce();
  });
  it("still verifies the user on ordinary authenticated requests",async()=>{
    await identity();expect(state.getUser).toHaveBeenCalledOnce();
  });
  it("rejects suspended or mismatched approved identities despite provider authentication",async()=>{
    for(const account of [{active:false,approved_email:user.email},{active:true,approved_email:"other@example.test"}]){
      state.account.mockResolvedValueOnce({data:account,error:null});
      await expect(identity({db,user} as unknown as Parameters<typeof identity>[0])).rejects.toThrow("account_not_authorized");
    }
  });
});
