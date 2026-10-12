import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb,portalOrigin} from "./server";
import {notifyClient} from "./services";
import {PortalError} from "./rules";
export const invoiceInput=z.object({idempotency_key:z.uuid(),client_id:z.uuid(),amount_minor:z.number().int().positive().max(100000000),description:z.string().trim().min(1).max(500)}).strict();
export async function createServiceInvoice(actor:string,raw:unknown) {
 const input=invoiceInput.parse(raw);
 checkDb((await adminDb().rpc("portal_create_service_invoice",{p_id:input.idempotency_key,p_client:input.client_id,p_amount:input.amount_minor,p_description:input.description,p_actor:actor})).error);
 return {message:"Draft invoice saved. No email, charge or payment confirmation was created."};
}
export async function transitionServiceInvoice(actor:string,raw:unknown) {
 const input=z.object({id:z.uuid(),status:z.enum(["issued","void"]),confirmed:z.literal(true)}).strict().parse(raw);
 const db=adminDb();
 checkDb((await db.rpc("portal_transition_service_invoice",{p_id:input.id,p_action:input.status,p_actor:actor})).error);
 if(input.status === "issued") {
   const result=await db.from("portal_invoices").select("client_id,description").eq("id",input.id).single();checkDb(result.error);
   if(!result.data) throw new PortalError("invoice_requires_reconciliation",409);
   await notifyClient(result.data.client_id,"StackEndBox invoice issued",`An invoice for ${result.data.description} is available at ${portalOrigin()}/client-portal/billing. This message doesn't confirm a payment.`,`invoice-issued:${input.id}`);
 }
 if(input.status === "issued") await audit(actor,"invoice_notification_queued",input.id,{status:input.status,payment_confirmed:false});
 return {message:input.status === "issued"?"Invoice issued and client notification queued. No payment or charge was created.":"Invoice voided. No payment was changed."};
}
