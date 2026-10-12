import { z } from "zod";
const receiptSchema = z.object({
  id: z.uuid(), order_id: z.uuid(), amount_minor: z.number().int().positive().safe(),
  currency: z.literal("usd"), status: z.string(), description: z.string(), created_at: z.iso.datetime({ offset: true }),
});
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function serviceInvoiceHtml(raw:unknown) {
 const i=receiptSchema.omit({order_id:true}).extend({status:z.enum(["draft","issued","void"])}).parse(raw);
 const amount=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(i.amount_minor/100);
 return `<!doctype html><html lang="en"><meta charset="utf-8"><title>StackEndBox invoice</title><main><h1>StackEndBox service invoice</h1><p>Invoice ${i.id}</p><p>${escape(i.description)}</p><p>${amount}</p><p>Status: ${escape(i.status)}</p><p>This document doesn't confirm a payment or a domain registration. Contact StackEndBox about agreed payment arrangements.</p></main></html>`;
}
export function receiptHtml(raw: unknown) {
  const receipt = receiptSchema.parse(raw);
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(receipt.amount_minor / 100);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>StackEndBox sandbox receipt</title><body><main><h1>StackEndBox</h1><h2>Sandbox payment receipt</h2><p>This records a test payment. It is not a tax invoice or proof of domain registration.</p><dl><dt>Receipt</dt><dd>${receipt.id}</dd><dt>Order</dt><dd>${receipt.order_id}</dd><dt>Description</dt><dd>${escape(receipt.description)}</dd><dt>Amount</dt><dd>${amount}</dd><dt>Status</dt><dd>${escape(receipt.status)}</dd><dt>Created</dt><dd>${escape(receipt.created_at)}</dd></dl><p>Check the portal for current refund, dispute, and fulfillment status.</p></main></body></html>`;
}
