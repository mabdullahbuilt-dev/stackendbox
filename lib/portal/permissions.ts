export const staffRoles=["operations_admin","domain_manager","billing_manager","support_staff","auditor"] as const;
export type StaffRole=typeof staffRoles[number];
export const rolePermissions={
  operations_admin:["clients.read","clients.write","domains.read","domains.assign","services.read","services.write","billing.read","billing.write","support.read","support.write","operations.read","operations.recover"],
  domain_manager:["clients.read","clients.write","domains.read","domains.assign"],
  billing_manager:["clients.read","domains.read","billing.read","billing.write"],
  support_staff:["clients.read","support.read","support.write"],
  auditor:["clients.read","domains.read","services.read","billing.read","support.read","operations.read"],
} as const;
export type Permission=typeof rolePermissions[StaffRole][number];
/** Unknown routes fail closed. Owner-only diagnostics/provider mutations stay owner-only. */
export function routePermission(route:string,method:string,section?:string):Permission|"owner"|null{
  const write=method==="POST";
  if(route.startsWith("auth/"))return null;
  if(/^invoices\/[^/]+\/download$/.test(route)&&!write)return "billing.read";
  if(/^admin\/invoices\/[^/]+\/checkout$/.test(route)&&write)return "billing.write";
  if(/^admin\/invoices\/[0-9a-f-]+\/sandbox-payment-check$/.test(route)&&write)return "billing.read";
  if(route==="data")return section==="settings"||section==="reset-password"?null:"owner";
  if(route==="admin/workspace")return ({domains:"domains.read",websites:"services.read",billing:"billing.read",requests:"support.read",settings:"owner",dashboard:"clients.read"} as const)[section||"dashboard"]||"owner";
  if(route.startsWith("admin/team"))return "owner";
  if(/^admin\/support(?:\/[0-9a-f-]+)?$/.test(route))return "support.read";
  if(["admin/support/change","admin/support/note"].includes(route))return write?"support.write":"owner";
  if(["admin/services-workspace","admin/service-client-options","admin/service-website-options"].includes(route)||/^admin\/service-lifecycle\/[0-9a-f-]+$/.test(route))return "services.read";
  if(route==="admin/service-lifecycle")return write?"services.write":"services.read";
  if(["admin/clients","admin/client-update","admin/client-access-email","admin/account-status","admin/provisioning-resume"].includes(route))return write?"clients.write":"clients.read";
  if(["admin/client-options","admin/client-email-review"].includes(route))return "clients.read";
  if(["admin/domain-handoff-preview","admin/domain-handoff-review","admin/activate-domain-client"].includes(route))return "domains.assign";
  if(["admin/import-domain","admin/sync"].includes(route))return "domains.assign";
  if(["admin/domain-search","admin/registrar-acceptance"].includes(route))return "domains.read";
  if(/^admin\/domains\/[^/]+\/(manage|registrant)$/.test(route)&&!write)return "domains.read";
  if(["admin/websites","admin/services","admin/website-update","admin/service-update"].includes(route))return write?"services.write":"services.read";
  if(["admin/renewals","admin/quotes","admin/pricing","admin/invoices","admin/invoice-status","admin/external-payments"].includes(route))return write?"billing.write":"billing.read";
  if(route==="admin/operations")return "operations.read";
  if(["admin/notification-reconcile","admin/notification-recover"].includes(route))return "operations.recover";
  if(route==="admin/request-status"||route==="requests"||/^requests\/[^/]+\/messages$/.test(route))return write?"support.write":"support.read";
  return "owner";
}
