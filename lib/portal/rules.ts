import { domainToASCII } from "node:url";

export class PortalError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function domainName(input: string) {
  if (/[\s/:@?#\\]/.test(input.trim())) throw new PortalError("invalid_domain");
  const value = domainToASCII(input.trim().toLowerCase().replace(/\.$/, ""));
  if (
    value.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
  )
    throw new PortalError("invalid_domain");
  return value;
}
export function assertCustomerDomain(name: string, protectedAsset = false) {
  if (protectedAsset || domainName(name) === "stackendbox.com")
    throw new PortalError("protected_company_domain", 403);
}
export function minorUnits(value: string | number) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new PortalError("invalid_money");
  const [whole, fraction = ""] = text.split(".");
  const result = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(result)) throw new PortalError("invalid_money");
  return result;
}
export function renewalPrice(supplier: number, fees: number, markup = 3000) {
  if (
    ![supplier, fees, markup].every(Number.isSafeInteger) ||
    supplier <= 0 ||
    fees < 0 ||
    markup < 0 ||
    markup > 10000
  )
    throw new PortalError("invalid_price");
  const result = Number(
    ((BigInt(supplier) + BigInt(fees)) * BigInt(10000 + markup) + 5000n) /
      10000n,
  );
  if (!Number.isSafeInteger(result)) throw new PortalError("invalid_price");
  return result;
}
export function verifiedPrice(
  p: {
    valid_until: string;
    verified_at: string;
    source: string;
    premium: boolean;
    requirements_verified: boolean;
    supplier_minor: number;
    fees_minor: number;
  },
  now = Date.now(),
) {
  if (
    !p.source.trim() ||
    !Number.isSafeInteger(p.supplier_minor) ||
    !Number.isSafeInteger(p.fees_minor) ||
    !Number.isFinite(Date.parse(p.valid_until)) ||
    Date.parse(p.valid_until) <= now ||
    Date.parse(p.verified_at) > now ||
    !Number.isFinite(Date.parse(p.verified_at)) ||
    p.premium ||
    !p.requirements_verified ||
    p.supplier_minor <= 0 ||
    p.fees_minor < 0
  )
    throw new PortalError("price_confirmation_required", 409);
}
export function sandboxOnly() {
  if (
    (process.env.WHOP_MODE || "sandbox") !== "sandbox" ||
    process.env.DOMAIN_LIVE_PURCHASES_ENABLED === "true" ||
    process.env.DOMAIN_LIVE_RENEWALS_ENABLED === "true"
  )
    throw new PortalError("live_operations_not_implemented", 503);
}
export function safeWebUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new PortalError("invalid_url");
  return url.href;
}
