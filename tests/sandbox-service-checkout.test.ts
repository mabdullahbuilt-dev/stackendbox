import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  invoice: {} as Record<string, unknown>,
  checkout: {} as Record<string, unknown>,
  rpc: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  notify: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@whop/sdk", () => ({
  WhopEnvironment: { Sandbox: { api: "https://sandbox-api.whop.com/api/v1", vault: "https://sandbox-vault-api.whop.com/api/v1" } },
  WhopClient: class {
    checkoutConfigurations = { create: state.create };
    payments = { retrieve: state.retrieve };
  },
}));
vi.mock("@/lib/portal/server", () => ({
  env: (key: string) => process.env[key],
  portalOrigin: () => "https://acceptance.example.invalid",
  checkDb: (error: unknown) => { if (error) throw error; },
  adminDb: () => ({
    rpc: state.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: table === "portal_invoices" ? state.invoice : state.checkout, error: null }) }) }),
      update: (value: unknown) => { state.update(table, value); return { eq: () => ({ eq: async () => ({ error: null }), in: async () => ({ error: null }) }) }; },
      upsert: (value: unknown) => { state.upsert(table, value); return Promise.resolve({ error: null }); },
    }),
  }),
}));
vi.mock("@/lib/portal/services", () => ({ notifyClient: state.notify }));

import { checkoutServiceInvoice, processWebhook } from "@/lib/portal/whop";

const id = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const secret = "ws_sandbox_fixture_not_a_real_secret";
const raw = JSON.stringify({ type: "payment.succeeded", data: { id: "pay_service_fixture" } });
function signed(body = raw) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    "webhook-id": "evt_service_fixture",
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${createHmac("sha256", secret).update(`evt_service_fixture.${timestamp}.${body}`).digest("base64")}`,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WHOP_MODE", "sandbox");
  vi.stubEnv("DOMAIN_LIVE_PURCHASES_ENABLED", "false");
  vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED", "false");
  vi.stubEnv("WHOP_SANDBOX_API_KEY", "sandbox_fixture_not_real");
  vi.stubEnv("WHOP_SANDBOX_COMPANY_ID", "biz_fixture");
  vi.stubEnv("WHOP_SANDBOX_WEBHOOK_SECRET", secret);
  state.invoice = { id, client_id: clientId, order_id: null, amount_minor: 100, currency: "usd", status: "issued", description: "Sandbox acceptance" };
  state.checkout = { invoice_id: id, client_id: clientId, environment: "sandbox", company_id: "biz_fixture", checkout_id: "ch_service_fixture", checkout_url: "https://sandbox.whop.com/checkout/test", payment_id: null };
  state.rpc.mockImplementation(async (name: string) => ({ data: name === "portal_reserve_service_invoice_checkout" ? "create" : "verified", error: null }));
  state.create.mockResolvedValue({ id: "ch_service_fixture", purchase_url: "https://sandbox.whop.com/checkout/test" });
  state.retrieve.mockResolvedValue({
    id: "pay_service_fixture", account_id: "biz_fixture", checkout_configuration_id: "ch_service_fixture",
    metadata: { invoice_id: id, client_id: clientId, purpose: "service_invoice", environment: "sandbox" },
    currency: "usd", total: { amount: "1.00", currency: "usd" }, status: "paid", substatus: "succeeded",
    paid_at: "2026-10-13T00:00:00Z", refunded_at: null, refunded_amount: null,
  });
  state.update.mockReturnValue(undefined);
  state.upsert.mockReturnValue(undefined);
  state.notify.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("service invoice Sandbox checkout", () => {
  it("pins checkout to the issued invoice and never attaches a registrar product", async () => {
    expect(await checkoutServiceInvoice(id)).toEqual({ url: "https://sandbox.whop.com/checkout/test" });
    expect(state.rpc).toHaveBeenCalledWith("portal_reserve_service_invoice_checkout", { p_invoice: id, p_company: "biz_fixture" });
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { invoice_id: id, client_id: clientId, purpose: "service_invoice", environment: "sandbox" },
      plan: expect.objectContaining({ initial_price: 1, plan_type: "one_time", visibility: "hidden" }),
    }), { idempotencyKey: `portal-service-invoice-${id}` });
    expect(state.create.mock.calls[0][0].plan.product_id).toBeUndefined();
    expect(state.rpc).toHaveBeenCalledWith("portal_finish_service_invoice_checkout", expect.objectContaining({ p_invoice: id, p_checkout: "ch_service_fixture" }));
  });
  it("rejects draft, void, or domain-order invoices before calling Whop", async () => {
    for (const change of [{ status: "draft" }, { status: "void" }, { order_id: id }]) {
      state.invoice = { id, client_id: clientId, order_id: null, amount_minor: 100, currency: "usd", status: "issued", ...change };
      await expect(checkoutServiceInvoice(id)).rejects.toThrow("issued_service_invoice_required");
    }
    expect(state.create).not.toHaveBeenCalled();
  });
  it("returns an existing qualified checkout without creating a second one", async () => {
    state.rpc.mockResolvedValueOnce({ data: "ready", error: null });
    expect(await checkoutServiceInvoice(id)).toEqual({ url: "https://sandbox.whop.com/checkout/test" });
    expect(state.create).not.toHaveBeenCalled();
  });
  it("leaves ambiguous provider failure for reconciliation, never retries automatically", async () => {
    state.create.mockRejectedValueOnce(new Error("timeout"));
    await expect(checkoutServiceInvoice(id)).rejects.toThrow("checkout_requires_reconciliation");
    expect(state.update).toHaveBeenCalledWith("portal_invoice_checkouts", { status: "action_required" });
    expect(state.create).toHaveBeenCalledTimes(1);
  });
  it("verifies signed paid evidence and uses the atomic invoice transition", async () => {
    expect(await processWebhook(raw, signed())).toEqual({ status: "verified" });
    expect(state.rpc).toHaveBeenCalledWith("portal_confirm_service_invoice_payment", expect.objectContaining({
      p_invoice: id, p_client: clientId, p_amount: 100, p_payment: "pay_service_fixture", p_company: "biz_fixture",
    }));
    expect(state.update).not.toHaveBeenCalledWith("portal_orders", expect.anything());
  });
  it.each(["client_id", "company_id", "checkout_id", "amount_minor"])("rejects mismatched %s", async field => {
    if (field === "amount_minor") state.invoice.amount_minor = 200;
    else state.checkout[field] = "wrong";
    await expect(processWebhook(raw, signed())).rejects.toThrow("payment_mismatch");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("records failed payment for review without marking invoice paid", async () => {
    state.retrieve.mockResolvedValueOnce({ ...(await state.retrieve()), status: "failed", substatus: "failed", paid_at: null });
    const failed = JSON.stringify({ type: "payment.failed", data: { id: "pay_service_fixture" } });
    expect(await processWebhook(failed, signed(failed))).toEqual({ status: "review_required" });
    expect(state.upsert).toHaveBeenCalledWith("portal_invoice_payment_events", expect.objectContaining({ invoice_id: id, event_type: "payment.failed" }));
    expect(state.rpc).not.toHaveBeenCalledWith("portal_confirm_service_invoice_payment", expect.anything());
  });
});
