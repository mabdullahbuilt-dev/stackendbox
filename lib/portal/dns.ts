import { z } from "zod";
import { PortalError } from "./rules";
const host = z.string().min(1).max(253).regex(/^(?!\.)(@|\*|([_*]\.)?(?:(?!-)(?=[^.]*[^\W_])[\w-]{1,63}(?<!-)($|\.)){1,127}(?<!\.))$/);
const uint16 = z.number().int().min(0).max(65535);
const protocol = z.string().min(2).max(63).regex(/^_[a-zA-Z0-9-]+$/);
const underscoredPort = z.string().regex(/^(\*|_[1-9]\d{0,4})$/).refine(s => s === "*" || Number(s.slice(1)) <= 65535);
const base = { name: host, ttl: z.number().int().min(60).max(3600) };
const svc = { svcPriority: uint16, targetName: z.union([z.literal("."), host]), svcParams: z.string().max(65535).regex(/^[^\r\n]*$/), port: underscoredPort.optional() };
export const dnsRecordSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("A"), address: z.ipv4() }).strict(),
  z.object({ ...base, type: z.literal("AAAA"), address: z.ipv6() }).strict(),
  z.object({ ...base, type: z.literal("ALIAS"), aliasName: host }).strict(),
  z.object({ ...base, type: z.literal("CNAME"), cname: host }).strict(),
  z.object({ ...base, type: z.literal("CAA"), flag: z.union([z.literal(0), z.literal(128)]), tag: z.enum(["issue", "issuewild", "iodef"]), value: z.string().min(1).max(256).regex(/^[ -~]+$/) }).strict(),
  z.object({ ...base, type: z.literal("MX"), exchange: host, preference: uint16 }).strict(),
  z.object({ ...base, type: z.literal("NS"), nameserver: host }).strict(),
  z.object({ ...base, type: z.literal("PTR"), pointer: host }).strict(),
  z.object({ ...base, type: z.literal("TXT"), value: z.string().min(1).max(65535) }).strict(),
  z.object({ ...base, type: z.literal("SRV"), service: protocol, protocol, priority: uint16, weight: uint16, port: z.number().int().min(1).max(65535), target: host }).strict(),
  z.object({ ...base, ...svc, type: z.literal("HTTPS"), scheme: z.literal("_https").optional() }).strict(),
  z.object({ ...base, ...svc, type: z.literal("SVCB"), scheme: protocol.optional() }).strict(),
  z.object({ ...base, type: z.literal("TLSA"), port: underscoredPort, protocol, usage: z.number().int().min(0).max(255), selector: z.number().int().min(0).max(255), matching: z.number().int().min(0).max(255), associationData: z.string().min(64).max(65535).regex(/^(?!\s)(\s?[0-9a-f]{2})+$/) }).strict(),
]).superRefine((r, ctx) => {
  if ((r.type === "HTTPS" || r.type === "SVCB") && r.port && !r.scheme) ctx.addIssue({ code: "custom", message: "Scheme is required when port is set" });
  if (r.type === "CNAME" && r.name === "@") ctx.addIssue({ code: "custom", message: "Use ALIAS for the apex" });
});
export type DnsRecord = z.infer<typeof dnsRecordSchema>;
export type ProviderRecord = Record<string, unknown> & { type: string; name: string; ttl?: number; group: { type: string } };
export function recordKey(record: Record<string, unknown>, includeTtl = false) {
  const entries = Object.entries(record).filter(([k]) => k !== "group" && (includeTtl || k !== "ttl"));
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, typeof value === "string" && !(record.type === "TXT" && key === "value") ? value.toLowerCase() : value]));
}
export function planDnsChange(records: ProviderRecord[], action: "add" | "edit" | "delete", before?: DnsRecord, after?: DnsRecord) {
  const old = before && records.find(r => recordKey(r) === recordKey(before));
  if (action !== "add" && (!old || old.group.type !== "custom" || recordKey(old, true) !== recordKey(before!, true))) throw new PortalError("dns_record_changed", 409);
  if (action !== "delete" && !after) throw new PortalError("dns_record_required");
  if (action === "delete") return { save: [] as DnsRecord[], remove: [before!], warning: "Deletion can interrupt your website or email." };
  const others = records.filter(r => r !== old);
  if (others.some(r => recordKey(r) === recordKey(after!))) throw new PortalError("duplicate_dns_record", 409);
  const sameName = others.filter(r => r.name.toLowerCase() === after!.name.toLowerCase());
  if (sameName.some(r => r.type === "CNAME") || (after!.type === "CNAME" && sameName.length)) throw new PortalError("dns_record_conflict", 409);
  const sameKey = before && recordKey(before) === recordKey(after!);
  if (old && !sameKey && (old.type === "CNAME" || after!.type === "CNAME") && old.name.toLowerCase() === after!.name.toLowerCase()) throw new PortalError("dns_non_atomic_replacement_requires_support", 409);
  return { save: [after!], remove: old && !sameKey ? [before!] : [], warning: "Changes can interrupt your website, email, or domain verification." };
}
