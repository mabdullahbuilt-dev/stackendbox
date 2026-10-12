import { describe, expect, it } from "vitest";
import { dnsRecordSchema, planDnsChange, type DnsRecord } from "@/lib/portal/dns";
const a: DnsRecord = { type: "A", name: "www", ttl: 3600, address: "192.0.2.1" };
const provider = { ...a, group: { type: "custom" } };
describe("DNS safety", () => {
  it.each([
    { type: "A", address: "192.0.2.1" }, { type: "AAAA", address: "2001:db8::1" },
    { type: "ALIAS", aliasName: "example.com" }, { type: "CNAME", cname: "example.com" },
    { type: "CAA", flag: 0, tag: "issue", value: "letsencrypt.org" },
    { type: "MX", exchange: "mail.example.com", preference: 10 },
    { type: "NS", nameserver: "ns.example.com" }, { type: "PTR", pointer: "example.com" },
    { type: "TXT", value: "verification=CaseSensitive" },
    { type: "SRV", service: "_sip", protocol: "_tcp", priority: 0, weight: 5, port: 5060, target: "sip.example.com" },
    { type: "HTTPS", svcPriority: 1, targetName: ".", svcParams: "alpn=h2" },
    { type: "SVCB", svcPriority: 0, targetName: "example.com", svcParams: "" },
    { type: "TLSA", port: "_443", protocol: "_tcp", usage: 3, selector: 1, matching: 1, associationData: "ab".repeat(32) },
  ])("validates documented $type fields", record => expect(dnsRecordSchema.safeParse({ name: "www", ttl: 3600, ...record }).success).toBe(true));
  it.each([{ ttl: 59 }, { ttl: 3601 }, { address: "not-ip" }, { name: "bad name" }, { force: true }])("rejects invalid fields %j", extra => expect(dnsRecordSchema.safeParse({ ...a, ...extra }).success).toBe(false));
  it("rejects duplicate records", () => expect(() => planDnsChange([provider], "add", undefined, a)).toThrow("duplicate_dns_record"));
  it("rejects conflicts with CNAME", () => expect(() => planDnsChange([provider], "add", undefined, {type:"CNAME", name:"www", ttl:3600, cname:"other.example"})).toThrow("dns_record_conflict"));
  it("updates TTL without deleting the matching record", () => expect(planDnsChange([provider], "edit", a, { ...a, ttl: 600 }).remove).toHaveLength(0));
  it("saves a replacement before deleting the old value", () => {
    const next = { ...a, address: "192.0.2.2" };
    expect(planDnsChange([provider], "edit", a, next)).toMatchObject({ save: [next], remove: [a] });
  });
  it("rejects stale concurrent edits", () => expect(() => planDnsChange([{ ...provider, ttl: 600 }], "edit", a, {...a, address:"192.0.2.2"})).toThrow("dns_record_changed"));
  it("never deletes records managed by another product", () => expect(() => planDnsChange([{...provider,group:{type:"product"}}], "delete", a)).toThrow("dns_record_changed"));
  it("does not delete-first to replace a conflicting CNAME", () => {
    const before = { type:"CNAME" as const, name:"www", ttl:3600, cname:"old.example" };
    expect(() => planDnsChange([{...before,group:{type:"custom"}}], "edit", before, {...before,cname:"new.example"})).toThrow("dns_non_atomic_replacement_requires_support");
  });
});
