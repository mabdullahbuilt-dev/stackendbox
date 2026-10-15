import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb,env,rateLimit} from "./server";
import {minorUnits,PortalError,sandboxOnly} from "./rules";
import {whop} from "./whop";
const money=z.object({amount:z.union([z.string(),z.number()]),currency:z.string()});
const paymentEvidenceSchema=z.object({id:z.string(),account_id:z.string(),checkout_configuration_id:z.string().nullish(),
 metadata:z.record(z.string(),z.unknown()).nullish(),currency:z.string(),total:money.nullish(),status:z.string(),substatus:z.string(),
 paid_at:z.iso.datetime({offset:true}).nullish(),refunded_at:z.iso.datetime({offset:true}).nullish(),refunded_amount:money.nullish()});

/** Provider read only. Never creates a checkout, confirms a payment or runs fulfillment. */
export async function reviewSandboxInvoicePayment(actor:string,rawId:string){
 sandboxOnly();const id=z.uuid().parse(rawId);await rateLimit(`sandbox-invoice-evidence:${id}`,3,300);
 const db=adminDb();
 const [saved,issued,checkout]=await Promise.all([
  db.from("portal_invoice_payments").select("provider_id,invoice_id,client_id,environment,amount_minor,currency,status").eq("invoice_id",id).maybeSingle(),
  db.from("portal_invoices").select("id,client_id,order_id,amount_minor,currency,status").eq("id",id).maybeSingle(),
  db.from("portal_invoice_checkouts").select("invoice_id,client_id,environment,company_id,checkout_id,payment_id").eq("invoice_id",id).maybeSingle(),
 ]);[saved,issued,checkout].forEach(r=>checkDb(r.error));
 const local=saved.data,invoice=issued.data,session=checkout.data,company=env("WHOP_SANDBOX_COMPANY_ID");
 if(!local||!invoice||!session)throw new PortalError("sandbox_payment_reference_required",409);
 if(local.environment!=="sandbox"||session.environment!=="sandbox"||invoice.order_id!==null||
    local.client_id!==invoice.client_id||session.client_id!==invoice.client_id||
    local.amount_minor!==invoice.amount_minor||local.currency!==invoice.currency||
    !local.provider_id||session.payment_id!==local.provider_id||!session.checkout_id||session.company_id!==company)
  throw new PortalError("payment_mismatch",422);
 let payment;try{payment=paymentEvidenceSchema.parse(await whop().payments.retrieve({id:local.provider_id}));}catch{throw new PortalError("sandbox_payment_provider_unavailable",503);}
 if(payment.id!==local.provider_id||payment.account_id!==company||payment.checkout_configuration_id!==session.checkout_id||
    payment.metadata?.purpose!=="service_invoice"||payment.metadata.invoice_id!==id||payment.metadata.client_id!==invoice.client_id||
    payment.metadata.environment!=="sandbox"||payment.currency!==invoice.currency||!payment.total||
    payment.total.currency!==invoice.currency||minorUnits(payment.total.amount)!==invoice.amount_minor)
  throw new PortalError("payment_mismatch",422);
 if(payment.refunded_amount&&(payment.refunded_amount.currency!==invoice.currency||minorUnits(payment.refunded_amount.amount)>invoice.amount_minor))throw new PortalError("payment_mismatch",422);
 const refunded=payment.refunded_at||payment.refunded_amount&&minorUnits(payment.refunded_amount.amount)>0;
 const state=refunded?"refund_review":payment.status==="paid"&&payment.substatus==="succeeded"&&payment.paid_at?"paid":
   payment.substatus==="failed"?"failed":payment.substatus==="canceled"?"canceled":"review_required";
 await audit(actor,"sandbox_invoice_payment_evidence_checked",id,{provider_state:state,local_status:local.status,financial_state_changed:false,registrar_action_performed:false});
 return {invoice_id:id,environment:"sandbox",provider_state:state,local_status:local.status,checked_at:new Date().toISOString(),
  message:`Sandbox provider evidence: ${state.replaceAll("_"," ")}. Saved payment status is unchanged. No charge, email or registrar operation was performed.`};
}
