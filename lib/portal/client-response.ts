import type { PortalTable } from "./data-scope";

// Public customer contracts. New database columns must be explicitly reviewed
// here before they can become part of a customer response.
const fields = {
  clients: "id,name,business_name,status,service_status,created_at",
  memberships: "client_id",
  domains: "id,name,lifecycle_status,registration_date,expiration_date,auto_renew,verification_status,security,last_synced_at,reconciliation_required",
  domain_assignments: "domain_id,client_id,holder_arrangement,legal_holder,manual_renewal,assigned_at",
  websites: "id,client_id,domain_id,name,url,status,project_status,last_verified_at,created_at",
  quotes: "id,client_id,domain,domain_id,kind,retail_minor,currency,years,expiration_snapshot,valid_until,created_at",
  orders: "id,client_id,quote_id,domain,kind,environment,amount_minor,currency,status,paid_at,created_at",
  payments: "id,client_id,order_id,amount_minor,currency,status,environment,created_at",
  invoices: "id,client_id,order_id,amount_minor,currency,status,description,created_at",
  requests: "id,client_id,category,subject,description,status,created_at,updated_at",
  messages: "id,request_id,client_id,author_id,body,created_at",
  documents: "id,client_id,name,mime_type,size_bytes,created_at",
  notifications: "id,client_id,title,body,created_at",
  service_entitlements: "id,client_id,website_id,service,description,status,created_at",
  external_payments: "id,client_id,source,transaction_reference,amount_minor,currency,paid_at,reconciliation_status,created_at",
} satisfies Record<PortalTable, string>;

export const clientColumns = (table: PortalTable) => fields[table];
export function customerErrorCode(code: string) {
  if (/^(spaceship_|registrant_|registrar_)/.test(code)) return "domain_information_unavailable";
  return /^(configuration_required:|brevo_|whop_|provider_|database_)/.test(code) ? "service_temporarily_unavailable" : code;
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function clientRow(table: PortalTable, value: unknown) {
  const row = object(value);
  const result = Object.fromEntries(fields[table].split(",").filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
  if (table === "domains") {
    const security = object(row.security), privacy = object(security.privacy);
    result.security = {
      eppStatuses: Array.isArray(security.eppStatuses) ? security.eppStatuses.filter(value => typeof value === "string") : [],
      privacy: typeof privacy.level === "string" ? { level: privacy.level } : {},
    };
  }
  return result;
}

const dnsFields: Record<string, string[]> = {
  A: ["address"], AAAA: ["address"], ALIAS: ["aliasName"], CNAME: ["cname"],
  CAA: ["flag", "tag", "value"], MX: ["exchange", "preference"], NS: ["nameserver"], PTR: ["pointer"], TXT: ["value"],
  SRV: ["service", "protocol", "priority", "weight", "port", "target"],
  HTTPS: ["svcPriority", "targetName", "svcParams", "port", "scheme"], SVCB: ["svcPriority", "targetName", "svcParams", "port", "scheme"],
  TLSA: ["port", "protocol", "usage", "selector", "matching", "associationData"],
};
export function clientDnsRecord(row: Record<string, unknown>) {
  const type = typeof row.type === "string" ? row.type : "Unknown";
  return {
    ...Object.fromEntries(["type", "name", "ttl", ...(dnsFields[type] || [])].filter(key => typeof row[key] === "string" || typeof row[key] === "number").map(key => [key, row[key]])),
    group: { type: object(row.group).type === "custom" ? "custom" : "managed" },
  };
}
