import "server-only";
import { WhopClient } from "@whop/sdk";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { z } from "zod";
import { adminDb, checkDb, env, portalOrigin } from "./server";
import { minorUnits, PortalError, sandboxOnly } from "./rules";
import { notifyClient } from "./services";

export function whop() {
  sandboxOnly();
  // SDK 2.x uses baseUrl/token. Checked against the installed definitions.
  return new WhopClient({
    token: env("WHOP_SANDBOX_API_KEY"),
    baseUrl: "https://sandbox-api.whop.com/api/v1",
    maxRetries: 0,
    timeoutInSeconds: 15,
  });
}
export async function checkout(order: {
  id: string;
  client_id: string;
  domain: string;
  kind: string;
  amount_minor: number;
  currency: string;
}) {
  const db = adminDb();
  const { data: locked, error } = await db
    .from("portal_orders")
    .update({
      status: "checkout_creating",
      company_id: env("WHOP_SANDBOX_COMPANY_ID"),
    })
    .eq("id", order.id)
    .eq("status", "awaiting_payment")
    .select("id")
    .maybeSingle();
  checkDb(error);
  if (!locked) throw new PortalError("checkout_already_processing", 409);
  try {
    const result = await whop().checkoutConfigurations.create(
      {
        account_id: env("WHOP_SANDBOX_COMPANY_ID"),
        mode: "payment",
        metadata: {
          order_id: order.id,
          client_id: order.client_id,
          domain: order.domain,
          environment: "sandbox",
        },
        redirect_url: `${portalOrigin()}/client-portal/billing?order=${order.id}`,
        plan: {
          account_id: env("WHOP_SANDBOX_COMPANY_ID"),
          product_id: env(
            order.kind === "registration"
              ? "WHOP_SANDBOX_REGISTRATION_PRODUCT_ID"
              : "WHOP_SANDBOX_RENEWAL_PRODUCT_ID",
          ),
          title:
            order.kind === "registration"
              ? "StackEndBox Domain Registration"
              : "StackEndBox Domain Renewal",
          description:
            "Sandbox test only. One year. No live domain registration or renewal.",
          currency: "usd",
          initial_price: order.amount_minor / 100,
          plan_type: "one_time",
          release_method: "buy_now",
          visibility: "hidden",
          force_create_new_plan: false,
        },
      },
      { idempotencyKey: `portal-order-${order.id}` },
    );
    if (
      !result.purchase_url ||
      new URL(result.purchase_url).hostname !== "sandbox.whop.com"
    )
      throw new PortalError("invalid_checkout_url", 502);
    const saved = await db
      .from("portal_orders")
      .update({
        checkout_id: result.id,
        checkout_url: result.purchase_url,
        status: "checkout_ready",
      })
      .eq("id", order.id)
      .eq("status", "checkout_creating");
    checkDb(saved.error);
    return { url: result.purchase_url };
  } catch {
    await db
      .from("portal_orders")
      .update({ status: "action_required" })
      .eq("id", order.id)
      .eq("status", "checkout_creating");
    throw new PortalError("checkout_requires_reconciliation", 502);
  }
}
const eventSchema = z.object({
  type: z.string(),
  data: z.object({ id: z.string() }).passthrough(),
});
export async function processWebhook(
  raw: string,
  headers: Record<string, string>,
) {
  sandboxOnly();
  let verified: unknown;
  try {
    verified = unwrapWebhook(raw, {
      headers,
      key: env("WHOP_SANDBOX_WEBHOOK_SECRET"),
    });
  } catch {
    throw new PortalError("invalid_webhook_signature", 401);
  }
  const event = eventSchema.parse(verified);
  const supported = [
    "payment.succeeded",
    "payment.failed",
    "payment.canceled",
    "refund.created",
    "refund.updated",
    "dispute.created",
    "dispute.updated",
  ];
  if (!supported.includes(event.type)) return { ignored: true };
  const client = whop();
  let paymentId = event.data.id;
  if (event.type.startsWith("refund.")) {
    const refund = await client.refunds.retrieve({ id: event.data.id });
    if (refund.account_id !== env("WHOP_SANDBOX_COMPANY_ID"))
      throw new PortalError("payment_mismatch", 422);
    paymentId = refund.payment_id;
  }
  if (event.type.startsWith("dispute.")) {
    const dispute = await client.disputes.retrieve({ id: event.data.id });
    if (dispute.account_id !== env("WHOP_SANDBOX_COMPANY_ID"))
      throw new PortalError("payment_mismatch", 422);
    paymentId = dispute.payment.id;
  }
  const payment = await client.payments.retrieve({ id: paymentId });
  if (!payment.metadata?.order_id) return { ignored: true };
  const orderId = z.string().uuid().parse(payment.metadata?.order_id);
  const db = adminDb();
  const { data: order, error } = await db
    .from("portal_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  checkDb(error);
  if (
    !order ||
    payment.id !== paymentId ||
    !payment.total ||
    payment.metadata?.environment !== "sandbox" ||
    payment.account_id !== env("WHOP_SANDBOX_COMPANY_ID") ||
    payment.account_id !== order.company_id ||
    payment.checkout_configuration_id !== order.checkout_id ||
    payment.metadata?.client_id !== order.client_id ||
    payment.metadata?.domain !== order.domain ||
    payment.currency !== order.currency ||
    payment.total.currency !== order.currency ||
    minorUnits(payment.total.amount) !== order.amount_minor
  )
    throw new PortalError("payment_mismatch", 422);
  if (
    event.type === "payment.succeeded" &&
    payment.status === "paid" &&
    payment.substatus === "succeeded" &&
    payment.paid_at &&
    !payment.refunded_at &&
    (!payment.refunded_amount ||
      minorUnits(payment.refunded_amount.amount) === 0)
  ) {
    const { data, error: transition } = await db.rpc("portal_confirm_payment", {
      p_event: headers["webhook-id"],
      p_order: orderId,
      p_payment: payment.id,
      p_checkout: payment.checkout_configuration_id,
      p_company: payment.account_id,
      p_amount: order.amount_minor,
      p_currency: payment.currency,
    });
    checkDb(transition);
    await notifyClient(
      order.client_id,
      "Sandbox payment received",
      `Your sandbox payment for ${order.domain} was verified. Registrar fulfillment is simulated. No real domain will be purchased or renewed. View your receipt at ${portalOrigin()}/client-portal/billing.`,
      `payment:${payment.id}`,
    );
    return { status: data };
  }
  // Hold simulations for verified refund/dispute evidence. Do not reverse real
  // registrar state or invent a final dispute outcome. Repeated writes converge.
  if (
    event.type.startsWith("refund.") ||
    event.type.startsWith("dispute.") ||
    payment.refunded_at
  ) {
    checkDb(
      (
        await db
          .from("portal_jobs")
          .update({ status: "held" })
          .eq("order_id", orderId)
          .eq("status", "queued")
      ).error,
    );
    checkDb(
      (
        await db
          .from("portal_orders")
          .update({ status: "action_required" })
          .eq("id", orderId)
      ).error,
    );
    if (
      payment.refunded_amount &&
      payment.refunded_amount.currency === order.currency
    ) {
      const amount = minorUnits(payment.refunded_amount.amount);
      checkDb(
        (
          await db
            .from("portal_ledger")
            .upsert(
              {
                order_id: orderId,
                category: "sandbox_refunded_total",
                amount_minor: -amount,
                currency: order.currency,
                reconciliation_status: "provider_verified",
              },
              { onConflict: "order_id,category" },
            )
        ).error,
      );
    }
    await notifyClient(
      order.client_id,
      "Sandbox billing update",
      `A billing adjustment for ${order.domain} requires review. No real registrar action was taken. Contact StackEndBox through your portal.`,
      `billing-review:${headers["webhook-id"]}`,
    );
  }
  // Preserve event evidence. Refunds/disputes require reconciliation, never domain deletion.
  const saved = await db.from("portal_events").upsert(
    {
      id: headers["webhook-id"],
      event_type: event.type,
      payment_id: payment.id,
      order_id: orderId,
      status: "review_required",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  checkDb(saved.error);
  return { status: "review_required" };
}
