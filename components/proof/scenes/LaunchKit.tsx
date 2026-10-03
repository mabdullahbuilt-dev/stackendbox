"use client";
import { Check, Shield } from "lucide-react";
import { Avatar, Line, Pill, Tile } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

export function LaunchKit({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 900, 1900, 3000, 4200, 5400], playing, reduced);
  const dash = s >= 3;
  return (
    <div className="dm">
      <SceneWindow title="LaunchKit · Workspace" status={<StatusChip tone={dash ? "green" : "blue"}>{dash ? "PLAN: PRO · ACTIVE" : "ONBOARDING"}</StatusChip>}>
        <div className="dm-wipe" data-dash={dash}>
          <div className="dm-onboard">
            <b>Create your workspace</b>
            <div className="dm-input"><span className="mono mono--muted">EMAIL</span>{s >= 1 ? "maya@northwind.example" : <Line w="45%" />}</div>
            <div className="dm-plans">
              {["Starter", "Pro", "Team"].map((p) => (
                <div key={p} className="dm-plan" data-on={s >= 2 && p === "Pro"}>{p}{s >= 2 && p === "Pro" && <Check />}</div>
              ))}
            </div>
          </div>
          <div className="dm-dash">
            <div className="mk-row"><b>Workspace</b><Pill tone="cyan">SAMPLE</Pill></div>
            <div className="mk-tiles"><Tile label="MEMBERS" value="8" /><Tile label="PROJECTS" value="24" tone="cyan" /><Tile label="SEATS" value="8/10" /></div>
            <div className="mk-trow"><Avatar>M</Avatar><span>Maya Chen</span><Pill tone="blue">Owner</Pill></div>
            <div className="mk-trow"><Avatar>S</Avatar><span>Sam Ortiz</span><Pill>Editor</Pill></div>
          </div>
        </div>
      </SceneWindow>
      <Dock on={s >= 4} className="dm-a">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">BILLING</span><div className="mk-row"><b>Subscription</b><Pill tone="green">active</Pill></div></div>
      </Dock>
      <Dock on={s >= 4} className="dm-b">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted"><Shield className="mk-inl" /> ROLES & PERMISSIONS</span><div className="mk-row dm-chips"><Pill tone="blue">Owner</Pill><Pill>Editor</Pill><Pill>Viewer</Pill></div></div>
      </Dock>
      <Dock on={s >= 5} className="dm-c">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">USAGE</span><div className="dm-meter"><i style={{ width: "62%" }} /></div><span className="mk-sub">Admin panel · behind the product</span></div>
      </Dock>
    </div>
  );
}
