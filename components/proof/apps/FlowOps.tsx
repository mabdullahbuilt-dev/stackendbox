import { BarChart3, CheckCircle2, ClipboardList, ListChecks, Workflow } from "lucide-react";
import { AppShell, Av, Chip } from "./Shell";

export const FLOWOPS_STEPS = 7;
const ROWS = [["Customer onboarding", "Sales", "R", "ok", "Complete"], ["Refund approval", "Finance", "J", "ok", "Complete"], ["Document review", "Legal", "K", "run", "In review"], ["Account update", "Support", "T", "ok", "Complete"]] as const;

export function FlowOps({ step }: { step: number }) {
  const status = step >= 6 ? ["ok", "Closed"] : step >= 5 ? ["ok", "Approved"] : step >= 4 ? ["run", "Needs approval"] : ["idle", "New"];
  const log = ["Request received", "Classified: Operations", "Assigned to Priya", "Approval requested", "Approved", "Notification sent", "Task closed, report updated"];
  return (
    <AppShell
      name="FlowOps" active={0} title="Requests"
      nav={[[ClipboardList, "Requests"], [Workflow, "Workflows"], [CheckCircle2, "Approvals"], [ListChecks, "Tasks"], [BarChart3, "Reports"]]}
      top={<Chip tone={step >= 6 ? "ok" : "run"}>{step >= 6 ? "All caught up" : "Processing"}</Chip>}
      rail={
        <>
          <div className="pa-card"><b className="mono">ACTIVITY</b>
            <ol className="pa-log">{log.slice(0, step + 1).map((l, i) => <li key={l} data-cur={i === step}>{l}</li>)}</ol>
          </div>
          <div className="pa-card"><b className="mono">COMPLETED</b><div className="pa-bars">{[30, 46, 38, 58, 50, step >= 6 ? 84 : 66].map((h, i) => <i key={i} style={{ height: `${h}%` }} data-cur={i === 5} />)}</div></div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Request</span><span>Category</span><span>Owner</span><span>Status</span></div>
        <div className="pa-tr pa-tr--new pa-tr4" data-cur>
          <span>Vendor approval #204</span>
          <span>{step >= 1 ? <Chip tone="ok">Operations</Chip> : <Chip tone="idle">Unassigned</Chip>}</span>
          <span>{step >= 2 ? <><Av tone="accent">P</Av>Priya</> : "None"}</span>
          <span><Chip tone={status[0] as "ok" | "run" | "idle"}>{status[1]}</Chip></span>
        </div>
        {ROWS.map(([n, c, a, t, s]) => (
          <div key={n} className="pa-tr pa-tr4"><span>{n}</span><span>{c}</span><span><Av>{a}</Av></span><span><Chip tone={t}>{s}</Chip></span></div>
        ))}
      </div>
      <div className="pa-foot"><span className="pa-note">{step >= 5 ? <CheckCircle2 aria-hidden /> : <Workflow aria-hidden />}{step >= 5 ? "Notification sent to requester" : "Workflow: vendor approval"}</span></div>
    </AppShell>
  );
}
