import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({
  adminDb: vi.fn(),
  audit: vi.fn(),
  checkDb: vi.fn(),
}));
import { acquisitionSchema, externalPaymentSchema } from "@/lib/portal/agency";
import { requireSandboxCheckout } from "@/lib/portal/rules";
afterEach(() => vi.unstubAllEnvs());
describe("agency financial boundary", () => {
  it("blocks checkout in Production even with a mistaken enabled flag", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "true");
    expect(() => requireSandboxCheckout()).toThrow(
      "payment_acceptance_pending",
    );
  });
  it("requires explicit sandbox acceptance for development", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "false");
    expect(() => requireSandboxCheckout()).toThrow(
      "payment_acceptance_pending",
    );
    vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "true");
    expect(() => requireSandboxCheckout()).not.toThrow();
  });
  it("requires customer approval and accurate holder arrangement", () => {
    const request = {
      idempotency_key: crypto.randomUUID(),
      client_id: crypto.randomUUID(),
      domain: "Example.COM",
      retail_minor: 4500,
      customer_approval: "Approved quote reference",
      holder_arrangement: "client_owned",
      legal_holder: "Authorized client",
    };
    expect(acquisitionSchema.parse(request).domain).toBe("example.com");
    expect(
      acquisitionSchema.safeParse({ ...request, customer_approval: " " })
        .success,
    ).toBe(false);
    expect(
      acquisitionSchema.safeParse({ ...request, retail_minor: 45.5 }).success,
    ).toBe(false);
  });
  it("never accepts a manually recorded payment as a Whop transaction", () => {
    const payment = {
      idempotency_key: crypto.randomUUID(),
      acquisition_id: crypto.randomUUID(),
      client_id: crypto.randomUUID(),
      source: "bank_transfer",
      transaction_reference: "Test reference",
      amount_minor: 4500,
      paid_at: new Date().toISOString(),
      evidence: "Bank statement reference",
      reconciliation_status: "verified",
      confirmed: true,
    };
    expect(externalPaymentSchema.safeParse(payment).success).toBe(true);
    expect(
      externalPaymentSchema.safeParse({ ...payment, source: "whop" }).success,
    ).toBe(false);
    expect(
      externalPaymentSchema.safeParse({ ...payment, evidence: "" }).success,
    ).toBe(false);
    expect(
      externalPaymentSchema.safeParse({ ...payment, confirmed: false }).success,
    ).toBe(false);
  });
});
