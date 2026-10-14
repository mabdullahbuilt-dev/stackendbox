import "server-only";
import { createHash } from "node:crypto";
import { authoritativeNameservers } from "./authoritative-dns";
import { z } from "zod";
import { adminDb, audit, checkDb, identity, rateLimit } from "./server";
import { assertCustomerDomain, domainName, PortalError } from "./rules";
import { spaceship, mutationAllowed } from "./spaceship";
import { dnsRecordSchema, planDnsChange, recordKey, type ProviderRecord } from "./dns";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => [k,canonical(v)]));
  return value;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export const domainStateVersion=(detail:Awaited<ReturnType<typeof spaceship.detail>>,items:Record<string,unknown>[])=>hash({nameservers:detail.nameservers,privacy:detail.privacyProtection,records:items.map(r=>recordKey(r,true)).sort()});
const dnsPage = z.object({ items: z.array(z.object({ type: z.string(), name: z.string(), ttl: z.number().optional(), group: z.object({ type: z.string() }) }).passthrough()), total: z.number() });
export const domainChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dns"), action: z.enum(["add", "edit", "delete"]), before: dnsRecordSchema.optional(), after: dnsRecordSchema.optional() }),
  z.object({ kind: z.literal("nameservers"), hosts: z.array(z.string().transform(domainName)).min(2).max(12).refine(hosts => new Set(hosts).size === hosts.length) }),
  z.object({ kind: z.literal("privacy"), level: z.enum(["public", "high"]), consent: z.literal(true) }),
]);
const requestSchema = z.object({ idempotency_key: z.uuid(), expected_version: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true), change: domainChangeSchema });
export async function authorizedDomain(name: string, auth: Awaited<ReturnType<typeof identity>>) {
  const { data: domain, error } = await auth.db.from("portal_domains").select("*").eq("name", domainName(name)).maybeSingle();
  checkDb(error);
  if (!domain) throw new PortalError("domain_not_found", 404);
  assertCustomerDomain(domain.name, domain.protected);
  const { data: assignment, error: ae } = await auth.db.from("portal_domain_assignments").select("client_id").eq("domain_id", domain.id).maybeSingle();
  checkDb(ae);
  if (!assignment) throw new PortalError("domain_not_assigned", 403);
  return { domain, assignment };
}
export async function readDomainState(name: string) {
  await rateLimit(`provider:detail:${name}`, 4, 300);
  const detail = await spaceship.detail(name);
  if(domainName(detail.name)!==domainName(name))throw new PortalError("registrar_domain_mismatch",502);
  const authoritativeHosts = await authoritativeNameservers(name);
  const expectedHosts = detail.nameservers?.hosts.map(s => s.toLowerCase().replace(/\.$/, "")) || [];
  const managed = detail.nameservers?.provider === "basic" && authoritativeHosts.length > 0 && authoritativeHosts.every(s => expectedHosts.includes(s.toLowerCase().replace(/\.$/, ""))) && authoritativeHosts.length === expectedHosts.length;
  const dns = managed ? dnsPage.parse(await spaceship.dns(name)) : { items: [], total: 0 };
  const version = domainStateVersion(detail,dns.items);
  let changesEnabled = true;
  try { mutationAllowed(name); } catch { changesEnabled = false; }
  return { detail, dns, version, managed, changesEnabled, checked_at:new Date().toISOString() };
}
export function clientDomainState(state:Awaited<ReturnType<typeof readDomainState>>) {
  const {lifecycleStatus,expirationDate,autoRenew,nameservers,privacyProtection}=state.detail;
  return {...state,detail:{lifecycleStatus,expirationDate,autoRenew,nameservers,privacyProtection}};
}
export async function domainOperationStatus(name:string,key:string,auth:Awaited<ReturnType<typeof identity>>) {
  const {domain}=await authorizedDomain(name,auth);
  const {data,error}=await adminDb().from("portal_domain_operations").select("id,status,updated_at").eq("domain_id",domain.id).eq("actor_id",auth.user.id).eq("idempotency_key",z.uuid().parse(key)).maybeSingle();
  checkDb(error);
  return data?{operation_id:data.id,status:data.status,updated_at:data.updated_at}:{status:"not_recorded"};
}
export async function changeDomain(name: string, raw: unknown, auth: Awaited<ReturnType<typeof identity>>) {
  const input = requestSchema.parse(raw);
  const { domain, assignment } = await authorizedDomain(name, auth);
  mutationAllowed(name);
  const assurance = await auth.db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || assurance.data?.currentLevel !== "aal2") throw new PortalError("domain_mfa_required", 403);
  const db = adminDb();
  const { data: prior, error: pe } = await db.from("portal_domain_operations").select("*").eq("idempotency_key", input.idempotency_key).maybeSingle();
  checkDb(pe);
  if (prior) {
    if (prior.actor_id !== auth.user.id || prior.domain_id !== domain.id || hash(prior.input) !== hash(input.change)) throw new PortalError("idempotency_conflict", 409);
    return { operation_id: prior.id, status: prior.status };
  }
  const { data: operation, error: oe } = await db.from("portal_domain_operations").insert({ domain_id: domain.id, client_id: assignment.client_id, actor_id: auth.user.id, idempotency_key: input.idempotency_key, expected_version: input.expected_version, kind: input.change.kind, status: "applying", input: input.change }).select("id").single();
  if (oe?.code === "23505") throw new PortalError("domain_operation_in_progress", 409);
  checkDb(oe);
  if (!operation) throw new PortalError("domain_operation_unavailable", 503);
  let attempted = false;
  try {
    const state = await readDomainState(name);
    if (state.version !== input.expected_version) throw new PortalError("domain_state_changed", 409);
    const change = input.change;
    const plan = change.kind === "dns" ? planDnsChange(state.dns.items as ProviderRecord[], change.action, change.before, change.after) : null;
    if (change.kind === "dns" && !state.managed) throw new PortalError("external_authoritative_dns", 409);
    await audit(auth.user.id, "domain_change_started", domain.id, { operation: operation.id, kind: change.kind });
    attempted = true;
    if (plan) {
      if (plan.save.length) {
        await spaceship.saveDns(name, plan.save);
        const saved = dnsPage.parse(await spaceship.dns(name));
        if (!plan.save.every(record => saved.items.some(r => recordKey(r, true) === recordKey(record, true)))) throw new PortalError("dns_save_unverified", 409);
      }
      if (plan.remove.length) await spaceship.deleteDns(name, plan.remove);
      const verified = dnsPage.parse(await spaceship.dns(name));
      if (plan.remove.some(record => verified.items.some(r => recordKey(r) === recordKey(record))) || !plan.save.every(record => verified.items.some(r => recordKey(r, true) === recordKey(record, true)))) throw new PortalError("dns_change_unverified", 409);
    } else {
      if (change.kind === "nameservers") await spaceship.setNameservers(name, change.hosts);
      if (change.kind === "privacy") await spaceship.setPrivacy(name, change.level);
      await rateLimit(`provider:detail:${name}`, 4, 300);
      const verified = await spaceship.detail(name);
      if (change.kind === "nameservers" && JSON.stringify([...verified.nameservers?.hosts || []].map(s => s.toLowerCase()).sort()) !== JSON.stringify([...change.hosts].sort())) throw new PortalError("nameservers_unverified", 409);
      if (change.kind === "privacy" && verified.privacyProtection?.level !== change.level) throw new PortalError("privacy_unverified", 409);
    }
    await audit(auth.user.id, "domain_change_verified", domain.id, { operation: operation.id });
    checkDb((await db.from("portal_domain_operations").update({ status: "verified", result: { verified_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq("id", operation.id)).error);
    return { operation_id: operation.id, status: "verified", message: "Provider state verified." };
  } catch (error) {
    checkDb((await db.from("portal_domain_operations").update({ status: attempted ? "review_required" : "rejected", result: { error: error instanceof PortalError ? error.code : "provider_request_failed" }, updated_at: new Date().toISOString() }).eq("id", operation.id)).error);
    if (attempted) throw new PortalError("domain_change_requires_reconciliation", 409);
    throw error;
  }
}
