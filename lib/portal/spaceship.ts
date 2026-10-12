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
async function request(path: string, body?: unknown) {
  const response = await fetch(`https://spaceship.dev/api/v1${path}`, {
    method: body ? "POST" : "GET",
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
  return response.json();
}
export const spaceship = {
  async inventory() {
    const all: z.infer<typeof domainSchema>[] = [];
    for (let skip = 0; skip < 10000; skip += 100) {
      const result = z
        .object({ items: z.array(domainSchema), total: z.number().int() })
        .parse(await request(`/domains?take=100&skip=${skip}`));
      all.push(...result.items);
      if (all.length >= result.total) return all;
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
  async dns(name: string) {
    return request(
      `/dns/records/${encodeURIComponent(domainName(name))}?take=100&skip=0`,
    );
  },
};
// No paid registration, renewal, auto-renew, transfer or DNS mutation method exists.
