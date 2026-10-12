import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({env:(name:string)=>`fixture-${name}`,portalOrigin:()=>"https://portal.example",audit:vi.fn()}));
import {sendAuthEmail} from "@/lib/portal/auth-email";
import {audit} from "@/lib/portal/server";
const fetcher=vi.fn();
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("fetch",fetcher);fetcher.mockResolvedValue(new Response(JSON.stringify({messageId:"fixture-message"})));});
afterEach(()=>vi.unstubAllGlobals());
describe("distinct account communication",()=>{
 it("sends account-ready instructions rather than a password-reset request",async()=>{
  await sendAuthEmail("fixture@example.com","fixture-token","invite","account_ready");
  const body=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.subject).toBe("Your StackEndBox account is ready");expect(body.textContent).toContain("No password reset is required");expect(body.textContent).toContain("/client-portal/login");
  expect(body.textContent).toContain("#token_hash=");expect(body.textContent).not.toContain("?token_hash=");
  expect(JSON.stringify(vi.mocked(audit).mock.calls)).not.toContain("fixture-token");
  expect(audit).toHaveBeenCalledWith(null,"auth_email_provider_accepted",undefined,expect.objectContaining({message_id:"fixture-message",delivery_confirmed:false}));
 });
 it("keeps recovery copy independent of the original account creation mode",async()=>{
  await sendAuthEmail("fixture@example.com","fixture-token","recovery","account_ready");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).subject).toBe("Reset your StackEndBox password");
 });
});
