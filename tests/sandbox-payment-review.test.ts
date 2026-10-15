import {it,expect,vi,beforeEach,afterEach} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({rows:{} as Record<string,unknown>,retrieve:vi.fn(),audit:vi.fn(),rate:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:state.rows[table],error:null})})})})}),audit:state.audit,rateLimit:state.rate,checkDb:(e:unknown)=>{if(e)throw Error("database_failed");},env:()=>"biz_fixture"}));
vi.mock("@/lib/portal/whop",()=>({whop:()=>({payments:{retrieve:state.retrieve}})}));
import {reviewSandboxInvoicePayment} from "@/lib/portal/sandbox-payment-review";
import {routePermission,rolePermissions} from "@/lib/portal/permissions";
const id="11111111-1111-4111-8111-111111111111",client="22222222-2222-4222-8222-222222222222";
const payment=()=>({id:"pay_fixture",account_id:"biz_fixture",checkout_configuration_id:"ch_fixture",metadata:{purpose:"service_invoice",invoice_id:id,client_id:client,environment:"sandbox"},currency:"usd",total:{amount:"1.00",currency:"usd"},status:"paid",substatus:"succeeded",paid_at:"2026-10-13T00:00:00Z",refunded_at:null,refunded_amount:null});
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv("WHOP_MODE","sandbox");vi.stubEnv("DOMAIN_LIVE_PURCHASES_ENABLED","false");vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED","false");
 state.rows={portal_invoices:{id,client_id:client,order_id:null,amount_minor:100,currency:"usd",status:"sandbox_paid"},portal_invoice_payments:{invoice_id:id,client_id:client,environment:"sandbox",provider_id:"pay_fixture",amount_minor:100,currency:"usd",status:"provider_confirmed"},portal_invoice_checkouts:{invoice_id:id,client_id:client,environment:"sandbox",company_id:"biz_fixture",checkout_id:"ch_fixture",payment_id:"pay_fixture"}};
 state.retrieve.mockResolvedValue(payment());
});
afterEach(()=>vi.unstubAllEnvs());
it("checks provider evidence without any financial transition, email or fulfillment interface",async()=>{
 expect(await reviewSandboxInvoicePayment("staff",id)).toMatchObject({provider_state:"paid",local_status:"provider_confirmed",environment:"sandbox"});
 expect(state.retrieve).toHaveBeenCalledExactlyOnceWith({id:"pay_fixture"});expect(state.audit).toHaveBeenCalledWith("staff","sandbox_invoice_payment_evidence_checked",id,expect.objectContaining({financial_state_changed:false,registrar_action_performed:false}));
});
it.each(["account_id","checkout_configuration_id","id"])("rejects provider %s mismatch",async key=>{
 state.retrieve.mockResolvedValue({...payment(),[key]:"wrong"});await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"payment_mismatch"});expect(state.audit).not.toHaveBeenCalled();
});
it("rejects wrong client, amount and environment instead of trusting metadata alone",async()=>{
 for(const changed of [{metadata:{...payment().metadata,client_id:"wrong"}},{total:{amount:"2.00",currency:"usd"}},{metadata:{...payment().metadata,environment:"live"}}]){
  state.retrieve.mockResolvedValue({...payment(),...changed});await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"payment_mismatch"});
 }
});
it("holds refund evidence for review without rewriting saved confirmation",async()=>{
 state.retrieve.mockResolvedValue({...payment(),refunded_at:"2026-10-14T00:00:00Z"});expect(await reviewSandboxInvoicePayment("staff",id)).toMatchObject({provider_state:"refund_review",local_status:"provider_confirmed"});
});
it.each(["failed","canceled"])("reads %s from the SDK substatus, not an invented receipt status",async substatus=>{
 state.retrieve.mockResolvedValue({...payment(),status:"void",substatus,paid_at:null});expect(await reviewSandboxInvoicePayment("staff",id)).toMatchObject({provider_state:substatus});
});
it("fails closed for non-Sandbox local records before calling the provider",async()=>{
 (state.rows.portal_invoice_checkouts as Record<string,unknown>).environment="live";await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"payment_mismatch"});expect(state.retrieve).not.toHaveBeenCalled();
});
it("doesn't invent missing payment references or hide provider failure",async()=>{
 state.rows.portal_invoice_payments=null;await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"sandbox_payment_reference_required"});expect(state.retrieve).not.toHaveBeenCalled();
});
it("returns a safe retryable error on provider failure",async()=>{
 state.retrieve.mockRejectedValue(Error("private provider payload"));await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"sandbox_payment_provider_unavailable",status:503});expect(state.audit).not.toHaveBeenCalled();
});
it("rejects malformed provider data without exposing it or recording a confirmation",async()=>{
 state.retrieve.mockResolvedValue({id:"pay_fixture",private_token:"never return this"});await expect(reviewSandboxInvoicePayment("staff",id)).rejects.toMatchObject({code:"sandbox_payment_provider_unavailable",status:503});expect(state.audit).not.toHaveBeenCalled();
});
it("permits billing evidence reads but denies Domain Manager and Support access",()=>{
 const permission=routePermission(`admin/invoices/${id}/sandbox-payment-check`,"POST");expect(permission).toBe("billing.read");
 expect(rolePermissions.domain_manager as readonly string[]).not.toContain(permission);expect(rolePermissions.support_staff as readonly string[]).not.toContain(permission);
});
