import { z } from "zod";
const receiptSchema = z.object({
  id: z.uuid(), order_id: z.uuid(), amount_minor: z.number().int().positive().safe(),
  currency: z.literal("usd"), status: z.string(), description: z.string(), created_at: z.iso.datetime({ offset: true }),
});
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function receiptHtml(raw: unknown) {
  const receipt = receiptSchema.parse(raw);
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(receipt.amount_minor / 100);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>StackEndBox sandbox receipt</title><body><main><h1>StackEndBox</h1><h2>Sandbox payment receipt</h2><p>This records a test payment. It is not a tax invoice or proof of domain registration.</p><dl><dt>Receipt</dt><dd>${receipt.id}</dd><dt>Order</dt><dd>${receipt.order_id}</dd><dt>Description</dt><dd>${escape(receipt.description)}</dd><dt>Amount</dt><dd>${amount}</dd><dt>Status</dt><dd>${escape(receipt.status)}</dd><dt>Created</dt><dd>${escape(receipt.created_at)}</dd></dl><p>Check the portal for current refund, dispute, and fulfillment status.</p></main></body></html>`;
}
