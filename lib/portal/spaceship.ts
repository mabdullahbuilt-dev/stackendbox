import "server-only";
import { z } from "zod";
import { env } from "./server";
import { domainName, PortalError } from "./rules";
import {approvedAcceptanceRecord} from "./dns-acceptance-grant";

export const contactIdSchema = z.string().regex(/^[a-zA-Z0-9]{27,32}$/);
export const domainContactsSchema = z.object({
  registrant: contactIdSchema,
  admin: contactIdSchema.optional(),
  tech: contactIdSchema.optional(),
  billing: contactIdSchema.optional(),
  attributes: z.array(contactIdSchema).max(5).optional(),
}).strict();
// The provider can return null for an absent administrative contact. Keep the
// mutation schema above strict so null never becomes a valid write input.
const domainReadContactsSchema = domainContactsSchema.extend({
  admin:contactIdSchema.nullish(),
  tech:contactIdSchema.nullish(),
  billing:contactIdSchema.nullish(),
  attributes:z.array(contactIdSchema).max(5).nullish(),
});
export const contactSchema = z.object({
  firstName: z.string().min(1).max(125),
  lastName: z.string().min(1).max(125),
  organization: z.string().max(255).optional(),
  email: z.email().max(255),
  address1: z.string().min(1).max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(255),
  country: z.string().regex(/^[A-Z]{2}$/),
  stateProvince: z.string().max(255).optional(),
  postalCode: z.string().max(16).optional(),
  phone: z.string().min(7).max(17).regex(/^\+\d{1,3}\.\d{4,}$/),
  phoneExt: z.string().regex(/^\d{0,7}$/).optional(),
  fax: z.string().min(7).max(17).regex(/^\+\d{1,3}\.\d{4,}$/).optional(),
  faxExt: z.string().regex(/^\d{0,7}$/).optional(),
  taxNumber: z.string().max(255).optional(),
});
export const domainSchema = z.object({
  name: z.string(),
  autoRenew: z.boolean(),
  isPremium: z.boolean(),
  registrationDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  lifecycleStatus: z.string(),
  verificationStatus: z.string().nullable().optional(),
  contacts: domainReadContactsSchema.optional(),
  suspensions: z.array(z.object({ reasonCode: z.string() })).optional(),
  nameservers: z
    .object({ provider: z.string(), hosts: z.array(z.string()) })
    .optional(),
  eppStatuses: z.array(z.string()).optional(),
  privacyProtection: z
    .object({ level: z.string(), contactForm: z.boolean().optional() })
    .optional(),
});
async function providerRequest(path: string, body?: unknown, method = body ? "POST" : "GET", account: "primary" | "test" = "primary") {
  const response = await fetch(`https://spaceship.dev/api/v1${path}`, {
    method,
    headers: {
      "X-API-Key": env(account === "test" ? "SPACESHIP_TEST_API_KEY" : "SPACESHIP_API_KEY"),
      "X-API-Secret": env(account === "test" ? "SPACESHIP_TEST_API_SECRET" : "SPACESHIP_API_SECRET"),
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
  if (response.status === 202) {
    const operationId = response.headers.get("spaceship-async-operationid");
    if (!operationId || !/^[a-zA-Z0-9_-]{1,128}$/.test(operationId)) throw new PortalError("spaceship_async_untracked", 502);
    return {operation_id:operationId,status:"pending"};
  }
  return response.status === 204 ? null : response.json();
}
export function createSpaceship(account: "primary" | "test") {
  const request = (path: string, body?: unknown, method = body ? "POST" : "GET") => {
    if (account === "test" && method !== "GET") throw new PortalError("personal_test_read_only", 403);
    return providerRequest(path,body,method,account);
  };
  const allowWrite = (name: string) => {
    if (account === "test") throw new PortalError("personal_test_read_only",403);
    mutationAllowed(name);
  };
  return {
  async connection() {
    const response=await fetch("https://spaceship.dev/api/v1/domains?take=1&skip=0",{headers:{"X-API-Key":env(account === "test"?"SPACESHIP_TEST_API_KEY":"SPACESHIP_API_KEY"),"X-API-Secret":env(account === "test"?"SPACESHIP_TEST_API_SECRET":"SPACESHIP_API_SECRET")},signal:AbortSignal.timeout(15000),cache:"no-store"});
    if(!response.ok){await response.body?.cancel();return {connection:"Failed",http_status:response.status};}
    const body=await response.json();
    const parsed=z.object({items:z.array(domainSchema),total:z.number().int().nonnegative()}).safeParse(body);
    return {connection:"Connected",http_status:response.status,inventory_schema_valid:parsed.success,...(!parsed.success?{invalid_fields:parsed.error.issues.slice(0,8).map(i=>({path:i.path.join("."),code:i.code}))}:{})};
  },
  async saveContact(name: string, input: unknown) {
    allowWrite(name);
    const body=z.object({contact:contactSchema.strict(),consent:z.literal(true)}).strict().parse(input);
    return z.object({contactId:contactIdSchema}).parse(await request("/contacts",body.contact,"PUT"));
  },
  async register(name: string, input: unknown) {
    allowWrite(name);
    if (process.env.DOMAIN_LIVE_PURCHASES_ENABLED !== "true") throw new PortalError("live_domain_purchases_disabled",403);
    const body=z.object({autoRenew:z.literal(false),years:z.number().int().min(1).max(10),privacyProtection:z.object({level:z.enum(["high","public"]),userConsent:z.literal(true)}).strict(),contacts:domainContactsSchema}).strict().parse(input);
    return request(`/domains/${encodeURIComponent(domainName(name))}`,body);
  },
  async renew(name: string, input: unknown) {
    allowWrite(name);
    if (process.env.DOMAIN_LIVE_RENEWALS_ENABLED !== "true") throw new PortalError("live_domain_renewals_disabled",403);
    const body=z.object({years:z.number().int().min(1).max(10),currentExpirationDate:z.iso.datetime().max(27)}).strict().parse(input);
    return request(`/domains/${encodeURIComponent(domainName(name))}/renew`,body);
  },
  async operation(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new PortalError("invalid_operation_id");
    return z.object({status:z.enum(["pending","success","failed"])}).passthrough().parse(await request(`/async-operations/${id}`));
  },
  async contact(id: string) {
    return contactSchema.parse(await request(`/contacts/${contactIdSchema.parse(id)}`));
  },
  async setContacts(name: string, input: unknown) {
    allowWrite(name);
    const contacts = domainContactsSchema.parse(input);
    return z.object({ verificationStatus: z.string().nullable() }).parse(
      await request(`/domains/${encodeURIComponent(domainName(name))}/contacts`, contacts, "PUT"),
    );
  },
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
    let expectedTotal: number | undefined;
    for (let skip = 0; skip < 10000; skip += 500) {
      const page = z.object({ items: z.array(z.record(z.string(), z.unknown())).max(500), total: z.number().int().nonnegative() }).parse(await request(`/dns/records/${encodeURIComponent(domainName(name))}?take=500&skip=${skip}`));
      if(expectedTotal!==undefined&&page.total!==expectedTotal) throw new PortalError("spaceship_dns_changed_retry",409);
      expectedTotal=page.total;
      items.push(...page.items);
      if(items.length>page.total)throw new PortalError("spaceship_incomplete_dns",502);
      if (items.length === page.total) return { items, total: page.total };
      if (page.items.length!==500) throw new PortalError("spaceship_incomplete_dns", 502);
    }
    throw new PortalError("spaceship_dns_limit", 502);
  },
  async saveDns(name: string, items: unknown[]) {
    allowWrite(name);
    return request(`/dns/records/${encodeURIComponent(domainName(name))}`, { force: false, items }, "PUT");
  },
  async acceptanceTxt(name:string,action:"add"|"delete",record:unknown){
    if(account!=="primary")throw new PortalError("personal_test_read_only",403);
    if(action!=="add"&&action!=="delete")throw new PortalError("dns_acceptance_action_invalid",403);
    const approved=approvedAcceptanceRecord(name,record);
    const path=`/dns/records/${encodeURIComponent(domainName(name))}`;
    if(action==="add")return request(path,{force:false,items:[approved]},"PUT");
    const {ttl:_ttl,...remove}=approved;
    return request(path,[remove],"DELETE");
  },
  async deleteDns(name: string, items: Record<string, unknown>[]) {
    allowWrite(name);
    return request(`/dns/records/${encodeURIComponent(domainName(name))}`, items.map(({ ttl: _ttl, ...record }) => record), "DELETE");
  },
  async setNameservers(name: string, hosts: string[]) {
    allowWrite(name);
    return request(`/domains/${encodeURIComponent(domainName(name))}/nameservers`, { provider: "custom", hosts }, "PUT");
  },
  async setPrivacy(name: string, privacyLevel: "public" | "high") {
    allowWrite(name);
    return request(`/domains/${encodeURIComponent(domainName(name))}/privacy/preference`, { privacyLevel, userConsent: true }, "PUT");
  },
};
}
export const spaceship = createSpaceship("primary");
export const spaceshipTest = createSpaceship("test");
export function mutationAllowed(name: string) {
  const allowed = (process.env.DOMAIN_MUTATION_ALLOWLIST || "").split(",").map(s => s.trim().toLowerCase());
  if (process.env.DOMAIN_LIVE_MUTATIONS_ENABLED !== "true" || !allowed.includes(domainName(name)) || domainName(name) === "stackendbox.com") throw new PortalError("live_domain_changes_disabled", 403);
}
// Paid operations require a separately approved durable business workflow before exposure.
