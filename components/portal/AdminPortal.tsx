"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, PortalContent, type Data } from "./Portal";
export function AdminPortal({ section }: { section: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const reload = useCallback(async () => {
    try { setData(await api("admin/workspace")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load administration."); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const content = ({ operations: "admin", support: "requests", billing: "billing", security: "settings" } as Record<string, string>)[section];
  return <div className="portal-shell">
    <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
      <Link className="portal-brand" href="/admin">StackEndBox<span>ADMINISTRATION</span></Link>
      <nav aria-label="Administration">
        {[["operations", "Clients & operations"], ["support", "Support"], ["billing", "Client billing"], ["security", "Account security"]].map(([key, title]) => <Link key={key} href={`/admin/${key}`} aria-current={section === key ? "page" : undefined}>{title}</Link>)}
      </nav>
      <div className="portal-sidebar-foot"><button onClick={async () => { try { await api("auth/logout", {}); router.replace("/client-portal/login"); router.refresh(); } catch (e) { setError((e as Error).message); } }}>Sign out</button></div>
    </aside>
    <div className="portal-workspace"><header className="portal-topbar"><button className="portal-menu" onClick={() => setOpen(!open)}>Menu</button><span>Private administration</span></header>
      <main id="main" className="portal-main">
        <p className="portal-sandbox">Sandbox billing. Live registrar mutations remain disabled.</p>
        {error ? <div role="alert" className="portal-error">{error}<button onClick={() => void reload()}>Retry</button></div> : data ? <PortalContent section={content} path={[content]} data={data} reload={reload} adminMode /> : <p role="status">Loading administration…</p>}
      </main>
    </div>
  </div>;
}
