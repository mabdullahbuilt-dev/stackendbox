import { BarChart3, Building2, ClipboardList, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell, Av, Chip } from "./Shell";

export const OPSBOARD_STEPS = 6;
const ROWS = [["Harbor redesign", "Maya", "M", "ok", "Active"], ["Atlas migration", "Ines", "I", "ok", "Active"], ["Corvid onboarding", "Leo", "L", "idle", "Planned"], ["Delta handover", "Jo", "J", "ok", "Active"]] as const;

/** Business management software: customer records, ownership, roles, tasks, reporting and audit history. */
export function OpsBoard({ step }: { step: number }) {
  const log = ["Project opened, A. Khan", "Owner assigned: Sam", "Role changed: Editor to Lead", "Task marked done", "Report refreshed", "Audit entry recorded"];
  return (
    <AppShell
      name="OpsBoard" active={1} title="Projects"
      nav={[[Building2, "Customers"], [ClipboardList, "Projects"], [UsersRound, "Team"], [BarChart3, "Reports"], [Settings, "Settings"]]}
      top={<Chip tone={step >= 5 ? "ok" : "run"}>{step >= 5 ? "Audit recorded" : "Editing"}</Chip>}
      rail={
        <>
          <div className="pa-card"><b className="mono">AUDIT HISTORY</b>
            <ol className="pa-log">{log.slice(0, step + 1).map((l, i) => <li key={l} data-cur={i === step}>{l}</li>)}</ol>
          </div>
          <div className="pa-card"><b className="mono">ON TRACK</b><div className="pa-bars">{[44, 52, 48, 60, 56, step >= 4 ? 86 : 64].map((h, i) => <i key={i} style={{ height: `${h}%` }} data-cur={i === 5} />)}</div></div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Project</span><span>Customer</span><span>Owner</span><span>Status</span></div>
        <div className="pa-tr pa-tr--new pa-tr4" data-cur>
          <span>Northwind rollout</span>
          <span>Northwind Ltd</span>
          <span>{step >= 1 ? <><Av tone="accent">S</Av>Sam</> : "Unassigned"}</span>
          <span><Chip tone={step >= 3 ? "ok" : "run"}>{step >= 3 ? "On track" : "In review"}</Chip></span>
        </div>
        {ROWS.map(([n, c, a, t, s]) => (
          <div key={n} className="pa-tr pa-tr4"><span>{n}</span><span>{c}</span><span><Av>{a}</Av></span><span><Chip tone={t}>{s}</Chip></span></div>
        ))}
      </div>
      <div className="pa-foot"><span className="pa-note"><ShieldCheck aria-hidden />{step >= 2 ? "Sam can now edit and approve" : "Role: Editor"}</span></div>
    </AppShell>
  );
}
