"use client";
import { Calendar, Sparkles } from "lucide-react";
import { Bubble, Line, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useCount, useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

const COLS = ["NEW", "QUALIFIED", "FOLLOW-UP", "BOOKED"];

export function LeadOS({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 900, 2100, 3300, 4500, 5600], playing, reduced);
  const score = useCount(s >= 1 ? 82 : 0, 900, reduced);
  const col = s >= 5 ? 3 : s >= 2 ? 1 : 0;
  const booked = s >= 4;
  return (
    <div className="dm">
      <SceneWindow title="LeadOS · Pipeline" status={<StatusChip tone={s >= 5 ? "green" : s >= 2 ? "blue" : "muted"}>{s >= 5 ? "BOOKED" : s >= 2 ? "ROUTED" : "NEW LEAD"}</StatusChip>}>
        <div className="dm-board" style={{ ["--c" as string]: col }}>
          {COLS.map((c, i) => (
            <div key={c} className="dm-col">
              <span className="mono mono--muted">{c}</span>
              <div className="dm-slot" />
              {i === 0 && <><div className="mk-card">Northwind · 3 seats</div><div className="mk-card">Studio 12</div></>}
              {i === 1 && <div className="mk-card">Acme workspace</div>}
              {i === 2 && <div className="mk-card">Orbit retail</div>}
              {i === 3 && <div className="mk-card">Kite & Co</div>}
            </div>
          ))}
          <div className="dm-lead" data-on>
            <div className="mk-row"><b>Maya Chen</b>{s >= 1 && <Pill tone="cyan">{score}/100</Pill>}</div>
            <span className="mk-sub">Web form · pricing question</span>
            {s >= 3 && <Pill tone="amber">Follow-up · Thu 14:00</Pill>}
          </div>
        </div>
      </SceneWindow>
      <Dock on={s >= 1} className="dm-a">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><Sparkles className="mk-inl" /> AI QUALIFICATION</span>
          <b className="dm-big tnum">{score}<small>/100</small></b>
          <div className="dm-meter"><i style={{ width: `${score}%` }} /></div>
        </div>
      </Dock>
      <Dock on={s >= 2} className="dm-b">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">MESSAGE PREVIEW</span>
          <Bubble tone="green">Hi Maya — thanks for reaching out. Does Thursday 14:00 work?</Bubble>
        </div>
      </Dock>
      <Dock on={s >= 3} className="dm-c">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><Calendar className="mk-inl" /> CALENDAR · THU 14:00</span>
          <div className="mk-row"><Line w="55%" tone="strong" /><Pill tone={booked ? "green" : "amber"}>{booked ? "Booked" : "Pending"}</Pill></div>
        </div>
      </Dock>
    </div>
  );
}
