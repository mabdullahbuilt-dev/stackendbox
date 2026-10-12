import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertCustomerDomain,
  domainName,
  minorUnits,
  renewalPrice,
  sandboxOnly,
  safeWebUrl,
  verifiedPrice,
} from "@/lib/portal/rules";

afterEach(() => vi.unstubAllEnvs());
describe("portal security and deterministic pricing", () => {
  it("normalizes domains and blocks invalid input", () => {
    expect(domainName(" Example.COM. ")).toBe("example.com");
    for (const value of [
      "https://example.com",
      "example.com/path",
      "-bad.com",
      "a..com",
      "localhost",
      "x.com\n.evil",
    ])
      expect(() => domainName(value)).toThrow();
  });
  it("blocks the protected company domain even after normalization", () => {
    expect(() => assertCustomerDomain("StackEndBox.COM.")).toThrow(
      "protected_company_domain",
    );
    expect(() => assertCustomerDomain("customer.com", true)).toThrow();
  });
  it("converts exact decimal money without floating-point multiplication", () => {
    expect(minorUnits("19.99")).toBe(1999);
    expect(minorUnits("0.29")).toBe(29);
    expect(minorUnits("45")).toBe(4500);
    for (const value of ["-1", "1e2", "1.001", "NaN", "", "9007199254740992"])
      expect(() => minorUnits(value)).toThrow();
  });
  it("applies 30 percent markup with integer half-up rounding", () => {
    expect(renewalPrice(1000, 0)).toBe(1300);
    expect(renewalPrice(999, 18)).toBe(1322);
    expect(renewalPrice(5, 0)).toBe(7);
    expect(() => renewalPrice(Number.MAX_SAFE_INTEGER, 1)).toThrow();
    expect(() => renewalPrice(9.99, 0)).toThrow();
  });
  const now = Date.parse("2026-10-12T12:00:00Z");
  const price = {
    source: "Supplier quote reference 123",
    verified_at: "2026-10-12T11:00:00Z",
    valid_until: "2026-10-12T13:00:00Z",
    premium: false,
    requirements_verified: true,
    supplier_minor: 1000,
    fees_minor: 18,
  };
  it("accepts verified current nonpremium pricing only", () => {
    expect(() => verifiedPrice(price, now)).not.toThrow();
    for (const change of [
      { source: " " },
      { premium: true },
      { requirements_verified: false },
      { valid_until: "2026-10-12T12:00:00Z" },
      { verified_at: "invalid" },
      { verified_at: "2026-10-12T13:00:00Z" },
      { supplier_minor: NaN },
      { fees_minor: -1 },
    ])
      expect(() => verifiedPrice({ ...price, ...change }, now)).toThrow(
        "price_confirmation_required",
      );
  });
  it("fails closed when any live operation flag is enabled", () => {
    vi.stubEnv("WHOP_MODE", "sandbox");
    vi.stubEnv("DOMAIN_LIVE_PURCHASES_ENABLED", "false");
    vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED", "false");
    expect(() => sandboxOnly()).not.toThrow();
    vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED", "true");
    expect(() => sandboxOnly()).toThrow();
    vi.stubEnv("DOMAIN_LIVE_RENEWALS_ENABLED", "false");
    vi.stubEnv("WHOP_MODE", "live");
    expect(() => sandboxOnly()).toThrow();
  });
  it("rejects unsafe external URLs", () => {
    expect(safeWebUrl("https://example.com")).toBe("https://example.com/");
    for (const value of [
      "javascript:alert(1)",
      "http://example.com",
      "https://user:pass@example.com",
    ])
      expect(() => safeWebUrl(value)).toThrow();
  });
});
