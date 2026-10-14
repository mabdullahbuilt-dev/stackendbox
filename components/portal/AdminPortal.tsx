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
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const reload = useCallback(async () => {
    try {
      const scope = ({operations:"dashboard",domains:"domains",support:"requests",billing:"billing",security:"settings"} as Record<string,string>)[section] || "dashboard";
      setData(await api(`admin/workspace?section=${scope}${scopedClient?`&client_id=${encodeURIComponent(scopedClient)}`:""}`));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load administration.",
      );
    }
  }, [section,scopedClient]);
  useEffect(() => {
    if (!["clients", "health", "renewals"].includes(section)) void reload();
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
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <Link prefetch={false} className="portal-brand" href="/admin">
          StackEndBox<span>ADMINISTRATION</span>
        </Link>
        <nav aria-label="Administration">
          {[
            ["operations", "Operations"],
            ["domains", "Domains"],
            ["renewals", "Renewals"],
            ["clients", "Clients"],
            ["health", "Backend health"],
            ["support", "Support"],
            ["billing", "Client billing"],
            ["security", "Account security"],
          ].map(([key, title]) => (
            <Link
              prefetch={false}
              key={key}
              href={`/admin/${key}`}
              aria-current={section === key ? "page" : undefined}
            >
              {title}
            </Link>
          ))}
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
          <button className="portal-menu" onClick={() => setOpen(!open)}>
            Menu
          </button>
          <span>Private administration{scopedClient?" · Selected client records":""}</span>
        </header>
        <main id="main" className="portal-main">
          <p className="portal-sandbox">
          Online payments and live registrar changes are disabled pending acceptance.
          </p>
          {section === "clients" ? (
            <AdminClients key={`${createClient}:${clientId||""}`} create={createClient} clientId={clientId} />
          ) : section === "health" ? (
            <AdminHealth />
          ) : section === "renewals" ? (
            <AdminRenewals />
          ) : error ? (
            <div role="alert" className="portal-error">
              {error}
              <button onClick={() => void reload()}>Retry</button>
            </div>
          ) : data ? (
            section === "domains" ? (
              <AdminDomains data={data} reload={reload} domain={domain} />
            ) : (
              <>{section === "operations" && <AdminOperations />}{section === "operations"?<details className="portal-panel"><summary>Client setup, website and service assignment</summary><PortalContent section={content} path={[content]} data={data} reload={reload} adminMode/></details>:<PortalContent
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
