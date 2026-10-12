import "server-only";
import { z } from "zod";
import { domainCandidates } from "./domain-search";
import { adminDb, checkDb, rateLimit } from "./server";
import { assertCustomerDomain, domainName, verifiedPrice } from "./rules";
import { spaceship } from "./spaceship";
const resultSchema = z.object({ domains: z.array(z.object({ domain: z.string(), result: z.string(), premiumPricing: z.array(z.unknown()).optional() })) });
type Availability = z.infer<typeof resultSchema>;
const cache = new Map<string, { until: number; checkedAt: string; data: Availability }>();
const pending = new Map<string, Promise<{ checkedAt: string; data: Availability }>>();
async function check(candidates: string[]) {
  const key = candidates.join(",");
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    await rateLimit("provider:spaceship:availability", 25, 30);
    const data = resultSchema.parse(await spaceship.availabilityBatch(candidates));
    const value = { data, checkedAt: new Date().toISOString(), until: Date.now() + 20000 };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
    return value;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
export async function searchDomains(input: string) {
  const candidates = domainCandidates(input);
  assertCustomerDomain(candidates[0]);
  const db = adminDb();
  const [availability, policy, prices] = await Promise.all([
    check(candidates),
    db.from("portal_settings").select("allowed_tlds,max_supplier_minor,registration_minor").single(),
    db.from("portal_pricing").select("*").eq("kind", "registration").in("domain", candidates).gt("valid_until", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
  ]);
  checkDb(policy.error); checkDb(prices.error);
  const results = candidates.map(name => {
    const matches = availability.data.domains.filter(d => domainName(d.domain) === name);
    const record = matches.length === 1 ? matches[0] : null;
    const premium = !!record?.premiumPricing?.length;
    const state = record?.result === "available" ? "available" : ["taken", "unavailable"].includes(record?.result || "") ? "unavailable" : "unverified";
    let retailMinor: number | null = null;
    const price = prices.data?.find(p => p.domain === name);
    if (state === "available" && !premium && price) {
      try {
        verifiedPrice(price);
        if (policy.data?.allowed_tlds.includes(name.split(".").slice(1).join(".")) && price.supplier_minor + price.fees_minor <= policy.data.max_supplier_minor && policy.data.registration_minor === 4500) retailMinor = 4500;
      } catch { /* Unverified supplier evidence must never become a retail quote. */ }
    }
    return { name, result: state, premium, retail_minor: retailMinor, term_years: 1, checked_at: availability.checkedAt };
  });
  return { primary: results[0], alternatives: results.slice(1).filter(r => r.result === "available").slice(0, 7), checked_at: availability.checkedAt };
}
