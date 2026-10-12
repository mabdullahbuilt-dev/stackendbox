import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:vi.fn(),audit:vi.fn(),checkDb:vi.fn(),rateLimit:vi.fn()}));
vi.mock("@/lib/portal/auth-email",()=>({sendAuthEmail:vi.fn()}));
import {clientEditSchema} from "@/lib/portal/client-operations";
describe("client edit boundary",()=>{
  const input={client_id:"11111111-1111-4111-8111-111111111111",name:"Client",business_name:"Business",status:"active"};
  it("rejects email, ownership and role changes through client editing",()=>{
    expect(clientEditSchema.safeParse(input).success).toBe(true);
    for(const field of ["email","approved_email","role","domain_id"])expect(clientEditSchema.safeParse({...input,[field]:"unauthorized"}).success).toBe(false);
  });
});
