import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:vi.fn(),checkDb:(e:unknown)=>{if(e)throw Error("database failed");},audit:vi.fn(),portalOrigin:()=>"https://portal.example"}));
vi.mock("@/lib/portal/auth-email",()=>({sendAuthEmail:vi.fn()}));
import {provisioningSchema,provisionClient} from "@/lib/portal/provisioning";
import {adminDb} from "@/lib/portal/server";
const input={idempotency_key:"11111111-1111-4111-8111-111111111111",name:"Client",business_name:"Business",email:"CLIENT@example.com",status:"suspended"};
beforeEach(()=>vi.clearAllMocks());
describe("client provisioning",()=>{
 it("normalizes the approved email and rejects password fields",()=>{
   expect(provisioningSchema.parse(input).email).toBe("client@example.com");
   expect(provisioningSchema.safeParse({...input,password:"not-stored"}).success).toBe(false);
 });
 it("requires an idempotency key and domain ownership evidence",()=>{
   expect(provisioningSchema.safeParse({...input,idempotency_key:undefined}).success).toBe(false);
   expect(provisioningSchema.safeParse({...input,domain_id:input.idempotency_key}).success).toBe(false);
 });
 it("recovers a previously created identity without creating another",async()=>{
   const row={id:input.idempotency_key,input:{status:"suspended"},client_id:null,auth_user_id:null,state:"reserved"};
   const committed={...row,client_id:"client-id",auth_user_id:"user-id",state:"committed"};
   const rpc=vi.fn().mockResolvedValueOnce({data:row,error:null}).mockResolvedValueOnce({data:"user-id",error:null}).mockResolvedValueOnce({data:committed,error:null});
   const createUser=vi.fn(),generateLink=vi.fn();
   const from=()=>({select:()=>({eq:()=>({single:async()=>({data:committed,error:null})})})});
   vi.mocked(adminDb).mockReturnValue({rpc,from,auth:{admin:{createUser,generateLink}}} as unknown as ReturnType<typeof adminDb>);
   const result=await provisionClient("admin-id",input);
   expect(result.client_id).toBe("client-id");expect(createUser).not.toHaveBeenCalled();expect(generateLink).not.toHaveBeenCalled();
   expect(rpc.mock.calls[2]).toEqual(["portal_commit_provisioning",{p_id:row.id,p_user:"user-id"}]);
 });
 it("retries a committed request without creating an identity or membership",async()=>{
   const row={id:input.idempotency_key,input:{status:"suspended"},client_id:"saved",auth_user_id:"identity",state:"committed"};
   const rpc=vi.fn().mockResolvedValue({data:row,error:null}),createUser=vi.fn();
   vi.mocked(adminDb).mockReturnValue({rpc,from:()=>({select:()=>({eq:()=>({single:async()=>({data:row,error:null})})})}),auth:{admin:{createUser}}} as unknown as ReturnType<typeof adminDb>);
   expect((await provisionClient("admin-id",input)).client_id).toBe("saved");expect(rpc).toHaveBeenCalledTimes(1);expect(createUser).not.toHaveBeenCalled();
 });
});
