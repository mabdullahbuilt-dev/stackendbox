import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Portal } from "../../components/portal/Portal";
import { AdminPortal } from "../../components/portal/AdminPortal";
import { PortalCache } from "../../components/portal/PortalCache";
import { Link } from "./navigation";
import { portalApiPath } from "../../lib/portal/browser-path";
import "./fonts.css";
import "../../styles/tokens.css";
import "../../styles/base.css";
import "../../styles/portal.css";

function App() {
  const path = window.location.pathname.split("/").filter(Boolean);
  const admin = path[0] === "admin";
  const section = path[1] || (admin ? "operations" : "dashboard");
  const publicPage = !admin && ["login", "forgot-password"].includes(section);
  const [identity, setIdentity] = useState<{ user_id: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (publicPage) return;
    const controller = new AbortController();
    fetch(portalApiPath(`auth/identity${admin ? "?admin=1" : ""}`), { cache: "no-store", signal: controller.signal }).then(async r => {
      const data = await r.json();
      if (r.status === 401) return window.location.replace("/client-portal/login");
      if (!r.ok) throw new Error(data.error === "administrator_mfa_required" ? "Verify your authenticator in Account security before opening administration." : data.error === "administrator_required" ? "This account doesn't have administrator access. Use your client portal." : "Account access could not be verified. Sign in again or retry.");
      if (data.password_change_required && section !== "reset-password") return window.location.replace("/client-portal/reset-password");
      setIdentity(data);
    }).catch(e => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, [publicPage, admin, section]);
  const allowed = admin ? ["operations", "domains", "clients", "health", "support", "billing", "security"] : ["login", "forgot-password", "reset-password", "dashboard", "domains", "websites", "billing", "renewals", "requests", "documents", "settings"];
  if (!allowed.includes(section) || path.length > 3 || (path.length === 3 && !(section === "domains" || (admin && section === "clients" && path[2] === "new")))) return <main className="portal-auth"><h1>Page not found</h1><Link href="/">Return home</Link></main>;
  if (error) return <main className="portal-auth"><h1>Account access unavailable</h1><p role="alert">{error}</p><Link href="/client-portal/dashboard">Client portal</Link> · <Link href="/client-portal/settings">Account security</Link> · <Link href="/client-portal/login">Sign in</Link><p><button onClick={() => location.reload()}>Retry</button></p></main>;
  if (!publicPage && !identity) return <main className="portal-auth"><p role="status">Verifying your account…</p></main>;
  return <div className="portal-root"><PortalCache>{admin ? <AdminPortal section={section} createClient={section === "clients" && path[2] === "new"} domain={section === "domains" ? path[2] : undefined} /> : <Portal path={[section, ...path.slice(2)]} userId={identity?.user_id || ""} />}</PortalCache></div>;
}
createRoot(document.getElementById("root")!).render(<App />);
