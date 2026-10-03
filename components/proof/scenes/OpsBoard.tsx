"use client";
import { Avatar, Bars, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

export function OpsBoard({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 900, 2000, 3200, 4400, 5600], playing, reduced);
  const approved = s >= 4;
  return (
    <div className="dm">
      <SceneWindow title="OpsBoard · Work queue" status={<StatusChip tone={approved ? "green" : s >= 3 ? "amber" : "blue"}>{approved ? "APPROVED" : s >= 3 ? "NEEDS APPROVAL" : "ROUTING"}</StatusChip>}>
        <div className="dm-board dm-board--3">
          {["INTAKE", "IN REVIEW", "DONE"].map((c, i) => (
            <div key={c} className="dm-col">
              <span className="mono mono--muted">{c}</span>
              {i === 0 && s < 2 && <div className="mk-card mk-card--lead-static">Vendor onboarding</div>}
              {i === 0 && <div className="mk-card">Access request</div>}
              {i === 1 && s >= 2 && !approved && <div className="mk-card mk-card--lead-static">Vendor onboarding</div>}
              {i === 1 && <div className="mk-card">Budget change</div>}
              {i === 2 && approved && <div className="mk-card mk-card--lead-static">Vendor onboarding</div>}
              {i === 2 && <div className="mk-card">Weekly report</div>}
            </div>
          ))}
        </div>
      </SceneWindow>
      <Dock on={s >= 2} className="dm-a">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">ROUTING RULE</span><Pill tone="blue">category = vendor → Finance</Pill></div>
      </Dock>
      <Dock on={s >= 3} className="dm-b">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">APPROVAL</span><div className="mk-row"><b>Vendor onboarding</b><Pill tone={approved ? "green" : "amber"}>{approved ? "Approved" : "Pending"}</Pill></div></div>
      </Dock>
      <Dock on={s >= 4} className="dm-c">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">THIS WEEK</span><Bars values={s >= 5 ? [40, 55, 48, 70, 82] : [40, 55, 48, 70, 30]} /><div className="mk-row"><Avatar>A</Avatar><Avatar>R</Avatar><Avatar>K</Avatar></div></div>
      </Dock>
    </div>
  );
}
