import { createHmac } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/services", () => ({
  notifyClient: vi.fn().mockResolvedValue(undefined),
}));
const mock = vi.hoisted(() => ({
  retrieve: vi.fn(),
  rpc: vi.fn(),
  order: {} as Record<string, unknown>,
}));
vi.mock("@whop/sdk", () => ({
  WhopClient: class {
    payments = { retrieve: mock.retrieve };
  },
}));
vi.mock("@/lib/portal/server", () => ({
  env: (key: string) => process.env[key],
  portalOrigin: () => "https://example.invalid",
  checkDb: (error: unknown) => {
    if (error) throw new Error("database error");
  },
  adminDb: () => ({
    rpc: mock.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: mock.order, error: null }) }),
      }),
    }),
  }),
}));
import { processWebhook } from "@/lib/portal/whop";
const secret = "ws_test_fixture_not_a_real_key";
const id = "ffffffff-0000-4000-8000-000000000001";
const raw = JSON.stringify({
  type: "payment.succeeded",
  data: { id: "pay_fixture" },
});
function signed(body = raw, timestamp = Math.floor(Date.now() / 1000)) {
  const event = "evt_fixture";
  const signature = createHmac("sha256", secret)
    .update(`${event}.${timestamp}.${body}`)
    .digest("base64");
  return {
    "webhook-id": event,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WHOP_MODE", "sandbox");
  vi.stubEnv("DOMAIN_LIVE_PURCHASES_ENABLED", "false");
  vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED", "false");
  vi.stubEnv("WHOP_SANDBOX_WEBHOOK_SECRET", secret);
  vi.stubEnv("WHOP_SANDBOX_COMPANY_ID", "biz_fixture");
  mock.order = {
    id,
    client_id: "client_fixture",
    domain: "example.com",
    company_id: "biz_fixture",
    checkout_id: "ch_fixture",
    amount_minor: 4500,
    currency: "usd",
  };
  mock.retrieve.mockResolvedValue({
    id: "pay_fixture",
    account_id: "biz_fixture",
    checkout_configuration_id: "ch_fixture",
    metadata: {
      order_id: id,
      environment: "sandbox",
      client_id: "client_fixture",
      domain: "example.com",
    },
    currency: "usd",
    total: { amount: "45.00", currency: "usd" },
    status: "paid",
    substatus: "succeeded",
    paid_at: "2026-10-12T12:00:00Z",
    refunded_at: null,
  });
  mock.rpc.mockResolvedValue({ data: "verified", error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("verified Whop payment processing", () => {
  it("rejects missing signatures without contacting Whop", async () => {
    await expect(processWebhook(raw, {})).rejects.toThrow(
      "invalid_webhook_signature",
    );
    expect(mock.retrieve).not.toHaveBeenCalled();
  });
  it("rejects tampering and stale signatures", async () => {
    await expect(processWebhook(raw + " ", signed())).rejects.toThrow(
      "invalid_webhook_signature",
    );
    await expect(
      processWebhook(raw, signed(raw, Math.floor(Date.now() / 1000) - 1000)),
    ).rejects.toThrow("invalid_webhook_signature");
  });
  it("retrieves the actual payment before advancing the atomic transition", async () => {
    expect(await processWebhook(raw, signed())).toEqual({ status: "verified" });
    expect(mock.retrieve).toHaveBeenCalledWith({ id: "pay_fixture" });
    expect(mock.rpc).toHaveBeenCalledWith(
      "portal_confirm_payment",
      expect.objectContaining({
        p_amount: 4500,
        p_order: id,
        p_payment: "pay_fixture",
      }),
    );
  });
  it.each([
    "company_id",
    "checkout_id",
    "client_id",
    "domain",
    "amount_minor",
    "currency",
  ])("rejects mismatched %s", async (field) => {
    mock.order[field] = field === "amount_minor" ? 1 : "wrong";
    await expect(processWebhook(raw, signed())).rejects.toThrow(
      "payment_mismatch",
    );
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("never trusts a redirect as payment proof", async () => {
    await expect(
      processWebhook(JSON.stringify({ order_id: id, success: true }), {}),
    ).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
