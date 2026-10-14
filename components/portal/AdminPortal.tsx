"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, PortalContent, type Data } from "./Portal";
import { AdminClients } from "./AdminClients";
import { AdminHealth } from "./AdminHealth";
import { AdminDomains } from "./AdminDomains";
import { AdminOperations } from "./AdminOperations";
import {AdminRenewals} from "./AdminRenewals";
import {AdminOverview} from "./AdminOverview";
import {AdminServices} from "./AdminServices";
import {customerScope} from "@/lib/portal/customer-scope";
import {Activity,Building2,ClipboardList,Globe2,LayoutDashboard,LifeBuoy,Menu,Settings,Users,Wallet} from "lucide-react";
export function AdminPortal({
  section,
  createClient = false,
  domain,
  clientId,
}: {
  section: string;
  createClient?: boolean;
  domain?: string;
  clientId?: string;
}) {
  const router = useRouter();
  const scopedClient=useSearchParams().get("client_id");
  const scope=customerScope(useSearchParams().get("scope"));
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const reload = useCallback(async () => {
    try {
      const dataSection = ({operations:"dashboard",domains:"domains",support:"requests",billing:"billing",security:"settings"} as Record<string,string>)[section] || "dashboard";
      setData(await api(`admin/workspace?section=${dataSection}${scopedClient?`&client_id=${encodeURIComponent(scopedClient)}`:""}${scope?`&scope=${scope}`:""}`));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load administration.",
      );
    }
  }, [section,scopedClient,scope]);
  useEffect(() => {
    if (!["overview", "clients", "services", "health", "renewals"].includes(section)) void reload();
  }, [reload, section]);
  const content = (
    {
      operations: "admin",
      support: "requests",
      billing: "billing",
      security: "settings",
    } as Record<string, string>
  )[section];
  return (
    <div className="portal-shell">
      <aside id="admin-navigation" className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <Link prefetch={false} className="portal-brand" href="/admin">
          StackEndBox<span>ADMINISTRATION</span>
        </Link>
        <nav aria-label="Administration">
          {([
            ["Workspace",[["overview","Overview",LayoutDashboard],["clients","Clients",Users],["domains","Domains",Globe2],["services","Websites & Services",Building2]]],
            ["Business",[["billing","Billing & Renewals",Wallet],["support","Support",LifeBuoy]]],
            ["Administration",[["operations","Operations",ClipboardList],["health","Service health",Activity],["security","Settings",Settings]]],
          ] as const).map(([group,items])=><div className="p-nav-group" key={group}><p className="p-nav-label">{group}</p>{items.map(([key,title,Icon]) => (
            <Link
              prefetch={false}
              key={key}
              href={`/admin/${key}`}
              onClick={()=>setOpen(false)}
              aria-current={section === key || key === "billing" && section === "renewals" ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true"/>{title}
            </Link>
          ))}</div>)}
        </nav>
        <div className="portal-sidebar-foot">
          <button
            onClick={async () => {
              try {
                await api("auth/logout", {});
                router.replace("/client-portal/login");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-topbar">
          <button className="portal-menu" aria-label="Toggle navigation" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)}>
            <Menu size={20}/>
          </button>
          <span>Workspace <span aria-hidden="true">/</span> {section==="overview"?"Overview":section.charAt(0).toUpperCase()+section.slice(1)}{scopedClient?" · Selected client":""}</span>
        </header>
        <main id="main" className="portal-main">
          <p className="portal-sandbox">
          Safe mode · Live payments and registrar changes are off
          </p>
          {scope&&!["overview","clients","operations"].includes(section)&&<p>{scope==="test"?"Test accounts only":"Customers, test accounts excluded"}. <Link href={`/admin/${section}`}>Show all records</Link></p>}
          {["billing","renewals"].includes(section)&&<nav className="portal-tabs" aria-label="Billing sections"><Link href="/admin/billing" aria-current={section==="billing"?"page":undefined}>Invoices & payments</Link><Link href="/admin/renewals" aria-current={section==="renewals"?"page":undefined}>Renewals</Link></nav>}
          {section === "overview" ? <AdminOverview/> : section === "clients" ? (
            <AdminClients key={`${createClient}:${clientId||""}`} create={createClient} clientId={clientId} />
          ) : section === "health" ? (
            <AdminHealth />
          ) : section === "renewals" ? (
            <AdminRenewals />
          ) : section === "services" ? (
            <AdminServices />
          ) : error ? (
            <div role="alert" className="portal-error">
              {error}
              <button onClick={() => void reload()}>Retry</button>
            </div>
          ) : data ? (
            section === "domains" ? (
              <AdminDomains data={data} reload={reload} domain={domain} />
            ) : (
              <>{section === "operations" && <AdminOperations />}{section === "operations"?<details className="portal-panel"><summary>Advanced operations and supplier pricing</summary><PortalContent section={content} path={[content]} data={data} reload={reload} adminMode/></details>:<PortalContent
                section={content}
                path={[content]}
                data={data}
                reload={reload}
                adminMode
              />}</>
            )
          ) : (
            <p role="status">Loading administration…</p>
          )}
        </main>
      </div>
    </div>
  );
}
