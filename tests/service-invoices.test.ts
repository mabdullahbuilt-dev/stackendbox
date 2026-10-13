import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:vi.fn(),audit:vi.fn(),checkDb:vi.fn(),portalOrigin:vi.fn()}));
vi.mock("@/lib/portal/services",()=>({notifyClient:vi.fn()}));
import {invoiceInput} from "@/lib/portal/invoices";
import {serviceInvoiceHtml} from "@/lib/portal/receipt";
const id="11111111-1111-4111-8111-111111111111";
describe("service invoice evidence",()=>{
 it("accepts only an agreed minor-unit amount, never a paid status",()=>{
   const input={idempotency_key:id,client_id:id,amount_minor:100,description:"Agreed service"};
   expect(invoiceInput.safeParse(input).success).toBe(true);
   expect(invoiceInput.safeParse({...input,status:"paid"}).success).toBe(false);
   expect(invoiceInput.safeParse({...input,amount_minor:1.5}).success).toBe(false);
 });
 it("escapes client-supplied descriptions without claiming payment",()=>{
   const html=serviceInvoiceHtml({id,amount_minor:100,currency:"usd",status:"issued",description:"<script>unsafe()</script>",created_at:"2026-10-13T00:00:00Z"});
   expect(html).not.toContain("<script>");expect(html).toContain("&lt;script&gt;");expect(html).toContain("doesn't confirm a payment");
 });
 it("distinguishes verified Sandbox payment from a live charge or disputed outcome",()=>{
   const invoice={id,amount_minor:100,currency:"usd",description:"Sandbox acceptance",created_at:"2026-10-13T00:00:00Z"};
   const paid=serviceInvoiceHtml({...invoice,status:"sandbox_paid"});
   expect(paid).toContain("Whop confirmed a Sandbox test payment");
   expect(paid).toContain("not a live charge");
   const review=serviceInvoiceHtml({...invoice,status:"sandbox_payment_review"});
   expect(review).toContain("refund or dispute requires review");
   expect(review).not.toContain("Whop confirmed a Sandbox test payment");
 });
});
