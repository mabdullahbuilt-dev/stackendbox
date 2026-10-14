export const portalTables = ["clients","memberships","domains","domain_assignments","websites","quotes","orders","payments","invoices","requests","messages","documents","notifications","service_entitlements","external_payments"] as const;
export type PortalTable = typeof portalTables[number];
export const clientSections = ["dashboard","domains","websites","renewals","billing","requests","documents","settings","reset-password"] as const;
export type ClientSection = typeof clientSections[number];
export function clientTables(section: ClientSection, domainDetail=false): readonly PortalTable[] {
  switch(section) {
    case "dashboard": return ["clients","domains","websites","requests","notifications","quotes","service_entitlements"];
    case "domains": return domainDetail ? ["clients","domains","domain_assignments","websites","quotes","orders"] : ["clients","domains","websites","quotes"];
    case "websites": return ["clients","websites","service_entitlements"];
    case "renewals": return ["clients","domains","domain_assignments","quotes","orders"];
    case "billing": return ["clients","orders","payments","invoices","external_payments"];
    case "requests": return ["clients","requests","messages"];
    case "documents": return ["clients","documents"];
    case "settings": return ["clients"];
    case "reset-password": return [];
  }
}

export function adminTables(section: ClientSection): readonly PortalTable[] {
  if (section === "dashboard") return ["clients","domains","domain_assignments"];
  return clientTables(section, section === "domains");
}
