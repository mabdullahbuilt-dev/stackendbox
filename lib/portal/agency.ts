import "server-only";
import { z } from "zod";
import { adminDb, audit, checkDb } from "./server";
import { assertCustomerDomain, domainName, PortalError } from "./rules";
const text = z.string().trim().min(1).max(1000);
export const acquisitionSchema = z
  .object({
    idempotency_key: z.uuid(),
    client_id: z.uuid(),
    domain: text.transform(domainName),
    retail_minor: z.number().int().positive().max(1000000),
    customer_approval: text,
    holder_arrangement: z.enum(["client_owned", "licensed"]),
    legal_holder: text.max(160),
  })
  .strict();
export const externalPaymentSchema = z
  .object({
    idempotency_key: z.uuid(),
    acquisition_id: z.uuid(),
    client_id: z.uuid(),
    source: z.enum(["bank_transfer", "cash", "external_processor"]),
    transaction_reference: text,
    amount_minor: z.number().int().positive().max(100000000),
    paid_at: z.iso.datetime(),
    evidence: text,
    reconciliation_status: z.enum(["unreconciled", "verified"]),
    confirmed: z.literal(true),
  })
  .strict();
export async function saveAcquisition(actor: string, body: unknown) {
  const { idempotency_key: id, ...input } = acquisitionSchema.parse(body);
  assertCustomerDomain(input.domain);
  const db = adminDb();
  const prior = await db
    .from("portal_acquisition_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checkDb(prior.error);
  if (prior.data) {
    if (Object.entries(input).some(([key, value]) => prior.data[key] !== value))
      throw new PortalError("idempotency_conflict", 409);
    return {
      request: prior.data,
      message: "Existing purchase request retained.",
    };
  }
  const client = await db
    .from("portal_clients")
    .select("id")
    .eq("id", input.client_id)
    .eq("status", "active")
    .maybeSingle();
  checkDb(client.error);
  if (!client.data) throw new PortalError("active_client_required", 409);
  const saved = await db
    .from("portal_acquisition_requests")
    .insert({ id, ...input, created_by: actor })
    .select("*")
    .single();
  checkDb(saved.error);
  await audit(actor, "agency_acquisition_requested", id);
  return {
    request: saved.data,
    message:
      "Purchase request saved. Payment and registrar registration remain separate.",
  };
}
export async function saveExternalPayment(actor: string, body: unknown) {
  const {
    idempotency_key: id,
    confirmed: _confirmed,
    ...input
  } = externalPaymentSchema.parse(body);
  if (Date.parse(input.paid_at) > Date.now())
    throw new PortalError("payment_date_in_future");
  const db = adminDb();
  const prior = await db
    .from("portal_external_payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checkDb(prior.error);
  if (prior.data) {
    if (
      Object.entries(input).some(([key, value]) =>
        key === "paid_at"
          ? Date.parse(String(prior.data[key])) !== Date.parse(String(value))
          : prior.data[key] !== value,
      )
    )
      throw new PortalError("idempotency_conflict", 409);
    return { message: "Existing external payment retained." };
  }
  const acquisition = await db
    .from("portal_acquisition_requests")
    .select("*")
    .eq("id", input.acquisition_id)
    .eq("client_id", input.client_id)
    .single();
  checkDb(acquisition.error);
  if (!acquisition.data || acquisition.data.retail_minor !== input.amount_minor)
    throw new PortalError("payment_quote_mismatch", 409);
  const saved = await db
    .from("portal_external_payments")
    .insert({ id, ...input, recorded_by: actor });
  checkDb(saved.error);
  await audit(actor, "external_payment_recorded", id, {
    source: input.source,
    reconciliation_status: input.reconciliation_status,
  });
  return {
    message:
      "External payment evidence saved. No Whop transaction or registrar registration was created.",
  };
}
