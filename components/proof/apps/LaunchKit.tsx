import { BarChart3, CreditCard, LayoutDashboard, Rocket, Settings, Users } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { AppShell, Av, Chip } from "./Shell";

export const LAUNCHKIT_STEPS = 5;
const MEMBERS = [["Ada Okoro", "Owner", "A"], ["Leo Park", "Admin", "L"], ["Ines Duarte", "Member", "I"]] as const;

export function LaunchKit({ step }: { step: number }) {
  return (
    <AppShell
      name="LaunchKit" active={1} title="Members"
      nav={[[LayoutDashboard, "Dashboard"], [Users, "Members"], [CreditCard, "Billing"], [BarChart3, "Usage"], [Settings, "Settings"]]}
      top={<><Chip tone={step >= 1 ? "ok" : "run"}>{step >= 1 ? "Workspace ready" : "Provisioning"}</Chip><Chip tone={step >= 5 ? "ok" : "idle"}>{step >= 5 ? "LIVE" : "Deploying"}</Chip></>}
      rail={
        <>
          <div className="pa-card pa-plan" data-on={step >= 2}>
            <b className="mono">PLAN</b>
            <div className="pa-plans">{["Starter", "Pro", "Team"].map((p) => <span key={p} data-sel={step >= 2 ? p === "Pro" : p === "Starter"}>{p}</span>)}</div>
            <div className="pa-pay"><BrandIcon name="stripe" size={14} />{step >= 2 ? <Chip tone="ok">Subscription active</Chip> : <Chip tone="idle">Free trial</Chip>}</div>
          </div>
          <div className="pa-card"><b className="mono">ROLES</b><div className="pa-roles">{["Owner", "Admin", "Member"].map((r) => <span key={r}>{r}</span>)}</div></div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Name</span><span>Role</span><span>Status</span></div>
        {step >= 0 && <div className="pa-tr pa-tr--new" data-on={step >= 0}><span><Av tone="accent">M</Av>Maya Chen</span><span>Member</span><span>{step >= 3 ? <Chip tone="ok">Active</Chip> : <Chip tone="run">Signed up</Chip>}</span></div>}
        {MEMBERS.map(([n, r, a]) => <div key={n} className="pa-tr"><span><Av>{a}</Av>{n}</span><span>{r}</span><span><Chip tone="ok">Active</Chip></span></div>)}
      </div>
      <div className="pa-foot"><span className="pa-note"><Users aria-hidden />{step >= 4 ? "Invite sent to team@northwind.example" : "Invite teammates to the workspace"}</span><span className="pa-note"><Rocket aria-hidden />{step >= 5 ? "Deployed to production" : "Deploying"}</span></div>
    </AppShell>
  );
}
