"use client";
import { Calendar, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, Bubble, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useCount, useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

const COLS = ["NEW", "QUALIFIED", "FOLLOW UP", "BOOKED"];

export function LeadOS({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 800, 1600, 2500, 3400, 4300, 5200, 6100], playing, reduced);
  const score = useCount(s >= 2 ? 82 : 0, 800, reduced);
  const col = s >= 6 ? 3 : s >= 4 ? 2 : s >= 3 ? 1 : 0;
  const tone = s >= 6 ? "green" : s >= 3 ? "blue" : s >= 2 ? "amber" : "muted";
  const label = s >= 6 ? "MEETING BOOKED" : s >= 4 ? "FOLLOW UP SENT" : s >= 3 ? "QUALIFIED" : s >= 2 ? "SCORING" : "NEW LEAD";
  return (
    <div className="dm">
      <SceneWindow title="LeadOS" status={<StatusChip tone={tone}>{label}</StatusChip>}>
        <div className="dm-board" style={{ ["--c" as string]: col }}>
          {COLS.map((c, i) => (
            <div key={c} className="dm-col">
              <span className="mono mono--muted">{c}</span>
              <div className="dm-slot" />
              {i === 0 && <><div className="mk-card">Northwind</div><div className="mk-card">Studio 12</div></>}
              {i === 1 && <div className="mk-card">Acme workspace</div>}
              {i === 2 && <div className="mk-card">Orbit retail</div>}
              {i === 3 && <div className="mk-card">Kite and Co</div>}
            </div>
          ))}
          <div className="dm-lead" data-open={s >= 1}>
            <div className="mk-row"><b>Maya Chen</b>{s >= 2 && <Pill tone="cyan">{score}/100</Pill>}</div>
            <span className="mk-sub">Website form</span>
            {s >= 3 && <span className="dm-owner"><Avatar>S</Avatar>Sam</span>}
          </div>
        </div>
      </SceneWindow>
      <Dock on={s >= 4} className="dm-a">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><MessageSquare className="mk-inl" /> WHATSAPP</span>
          <Bubble tone="green">Hi Maya, thanks for reaching out. Does Thursday at 14:00 work?</Bubble>
        </div>
      </Dock>
      <Dock on={s >= 5} className="dm-b">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><Calendar className="mk-inl" /> THURSDAY 14:00</span>
          <div className="mk-row"><b>Intro call</b><Pill tone={s >= 6 ? "green" : "amber"}>{s >= 6 ? "Booked" : "Held"}</Pill></div>
        </div>
      </Dock>
      <Dock on={s >= 2} className="dm-c">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted"><Sparkles className="mk-inl" /> ACTIVITY</span>
          <div className="dm-actlog">
            {["Lead received", "Scored 82 out of 100", "Assigned to Sam", "Follow up sent", "Meeting booked"].map((t, i) => (
              <p key={t} data-on={s >= [0, 2, 3, 4, 6][i]}><i />{t}</p>
            ))}
          </div>
        </div>
      </Dock>
    </div>
  );
}
