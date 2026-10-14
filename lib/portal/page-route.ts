/** Shared static route contract. Unknown paths must not become a dashboard. */
export function portalPageRoute(pathname: string) {
  const path = pathname.split("/").filter(Boolean);
  const admin = path[0] === "admin";
  if (!admin && path[0] !== "client-portal") return null;
  const aliases: Record<string, string> = admin ? {} : { support: "requests", account: "settings" };
  const section = aliases[path[1]] || path[1] || (admin ? "operations" : "dashboard");
  const allowed = admin
    ? ["operations", "domains", "clients", "health", "support", "billing", "security", "renewals"]
    : ["login", "forgot-password", "reset-password", "dashboard", "domains", "websites", "billing", "renewals", "requests", "documents", "settings"];
  const detail = path[2];
  if(section === "domains" && detail === "buy") return null;
  if (!allowed.includes(section) || path.length > 3) return null;
  if (detail && section !== "domains" && !(admin && section === "clients" && (detail === "new" || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(detail)))) return null;
  return { admin, section, detail, publicPage: !admin && ["login", "forgot-password"].includes(section) };
}
