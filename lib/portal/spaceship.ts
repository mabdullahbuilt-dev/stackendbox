import "server-only";
import { z } from "zod";
import { env } from "./server";
import { domainName, PortalError } from "./rules";

export const domainSchema = z.object({
  name: z.string(),
  autoRenew: z.boolean(),
  isPremium: z.boolean(),
  registrationDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  lifecycleStatus: z.string(),
  verificationStatus: z.string().optional(),
  nameservers: z
    .object({ provider: z.string(), hosts: z.array(z.string()) })
    .optional(),
  eppStatuses: z.array(z.string()).optional(),
  privacyProtection: z
    .object({ level: z.string(), contactForm: z.boolean().optional() })
    .optional(),
});
async function request(path: string, body?: unknown, method = body ? "POST" : "GET") {
  const response = await fetch(`https://spaceship.dev/api/v1${path}`, {
    method,
    headers: {
      "X-API-Key": env("SPACESHIP_API_KEY"),
      "X-API-Secret": env("SPACESHIP_API_SECRET"),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new PortalError(
      `spaceship_${response.status}`,
      response.status === 429 ? 429 : 502,
    );
  return response.status === 204 ? null : response.json();
}
export const spaceship = {
  async inventory() {
    const all: z.infer<typeof domainSchema>[] = [];
    const seen = new Set<string>();
    let expectedTotal: number | undefined;
    for (let skip = 0; skip < 10000; skip += 100) {
      const result = z
        .object({ items: z.array(domainSchema).max(100), total: z.number().int().nonnegative() })
        .parse(await request(`/domains?take=100&skip=${skip}`));
      if (expectedTotal !== undefined && result.total !== expectedTotal)
        throw new PortalError("spaceship_inventory_changed_retry", 409);
      expectedTotal = result.total;
      for (const item of result.items) {
        const name = domainName(item.name);
        if (seen.has(name)) throw new PortalError("spaceship_duplicate_inventory", 502);
        seen.add(name);
      }
      all.push(...result.items);
      if (all.length > result.total) throw new PortalError("spaceship_incomplete_inventory", 502);
      if (all.length === result.total) return all;
      if (!result.items.length)
        throw new PortalError("spaceship_incomplete_inventory", 502);
    }
    throw new PortalError("spaceship_inventory_limit", 502);
  },
  async detail(name: string) {
    return domainSchema.parse(
      await request(`/domains/${encodeURIComponent(domainName(name))}`),
    );
  },
  async availability(name: string) {
    const result = await request("/domains/available", {
      domains: [domainName(name)],
    });
    return result as unknown;
  },
  async availabilityBatch(names: string[]) {
    if (!names.length || names.length > 20) throw new PortalError("invalid_availability_batch");
    return request("/domains/available", { domains: [...new Set(names.map(domainName))] });
  },
  async dns(name: string) {
    const items: Record<string, unknown>[] = [];
    for (let skip = 0; skip < 10000; skip += 500) {
      const page = z.object({ items: z.array(z.record(z.string(), z.unknown())), total: z.number().int().nonnegative() }).parse(await request(`/dns/records/${encodeURIComponent(domainName(name))}?take=500&skip=${skip}`));
      items.push(...page.items);
      if (items.length >= page.total) return { items, total: page.total };
      if (!page.items.length) throw new PortalError("spaceship_incomplete_dns", 502);
    }
    throw new PortalError("spaceship_dns_limit", 502);
  },
  async saveDns(name: string, items: unknown[]) {
    mutationAllowed(name);
    return request(`/dns/records/${encodeURIComponent(domainName(name))}`, { force: false, items }, "PUT");
  },
  async deleteDns(name: string, items: Record<string, unknown>[]) {
    mutationAllowed(name);
    return request(`/dns/records/${encodeURIComponent(domainName(name))}`, items.map(({ ttl: _ttl, ...record }) => record), "DELETE");
  },
  async setNameservers(name: string, hosts: string[]) {
    mutationAllowed(name);
    return request(`/domains/${encodeURIComponent(domainName(name))}/nameservers`, { provider: "custom", hosts }, "PUT");
  },
  async setPrivacy(name: string, privacyLevel: "public" | "high") {
    mutationAllowed(name);
    return request(`/domains/${encodeURIComponent(domainName(name))}/privacy/preference`, { privacyLevel, userConsent: true }, "PUT");
  },
};
export function mutationAllowed(name: string) {
  const allowed = (process.env.DOMAIN_MUTATION_ALLOWLIST || "").split(",").map(s => s.trim().toLowerCase());
  if (process.env.DOMAIN_LIVE_MUTATIONS_ENABLED !== "true" || !allowed.includes(domainName(name)) || domainName(name) === "stackendbox.com") throw new PortalError("live_domain_changes_disabled", 403);
}
// Paid registration, renewal, auto-renew and transfer remain unimplemented and disabled.
