import { AlertTriangle, Check, CircleDot, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Status that never relies on color alone: icon + label + tone. */
export function Chip({ tone = "idle", children }: { tone?: "ok" | "run" | "bad" | "idle"; children: ReactNode }) {
  const Ic = tone === "ok" ? Check : tone === "bad" ? AlertTriangle : CircleDot;
  return <span className="pa-chip" data-tone={tone}><Ic aria-hidden />{children}</span>;
}
export function Av({ children, tone }: { children: ReactNode; tone?: "accent" }) {
  return <span className="pa-av" data-tone={tone}>{children}</span>;
}

/** Product chrome shared by every proof app: sidebar, top bar, body, optional right rail. */
export function AppShell({ name, nav, active, title, top, children, rail }: { name: string; nav: [LucideIcon, string][]; active: number; title: string; top?: ReactNode; children: ReactNode; rail?: ReactNode }) {
  return (
    <div className="pa">
      <aside className="pa-side">
        <div className="pa-brand"><i />{name}</div>
        <ul>{nav.map(([Ic, t], i) => <li key={t} data-act={i === active}><Ic aria-hidden />{t}</li>)}</ul>
      </aside>
      <div className="pa-main">
        <header className="pa-top"><h4>{title}</h4><div>{top}</div></header>
        <div className="pa-body">
          <div className="pa-content">{children}</div>
          {rail && <div className="pa-rail">{rail}</div>}
        </div>
      </div>
    </div>
  );
}
