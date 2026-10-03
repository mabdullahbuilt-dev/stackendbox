"use client";
import { Bubble, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

export function SupportGrid({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 900, 2000, 3200, 4400, 5600], playing, reduced);
  const escalated = s >= 3;
  return (
    <div className="dm">
      <SceneWindow title="SupportGrid · Inbox" status={<StatusChip tone={escalated ? "amber" : "green"}>{escalated ? "HUMAN REQUIRED" : "AUTO-RESOLVING"}</StatusChip>}>
        <div className="dm-split">
          <ul className="dm-tickets">
            <li data-state={s >= 2 ? "done" : "open"}><b>#1042 · Reset password</b><Pill tone={s >= 2 ? "green" : "amber"}>{s >= 2 ? "Resolved by AI" : "Open"}</Pill></li>
            <li data-state={escalated ? "flag" : "open"} data-on={s >= 1}><b>#1043 · Refund dispute</b><Pill tone={escalated ? "red" : "amber"}>{escalated ? "Escalated" : "Open"}</Pill></li>
            <li><b>#1044 · Invoice copy</b><Pill tone="green">Resolved by AI</Pill></li>
          </ul>
          <div className="dm-convo">
            <span className="mono mono--muted">{escalated ? "#1043 · HUMAN LANE" : "#1042 · CONVERSATION"}</span>
            {!escalated ? (
              <>
                <Bubble me>I can&apos;t log in.</Bubble>
                {s >= 1 && <Bubble tone="green">Here&apos;s a reset link. See: Account help · Passwords</Bubble>}
              </>
            ) : (
              <>
                <Bubble me>I was charged twice.</Bubble>
                <Bubble>Low confidence — routed to a person with a summary.</Bubble>
              </>
            )}
          </div>
        </div>
      </SceneWindow>
      <Dock on={s >= 1} className="dm-a">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">SOURCES</span><div className="mk-row dm-chips"><Pill tone="cyan">Help centre</Pill><Pill tone="cyan">Policy v3</Pill></div></div>
      </Dock>
      <Dock on={escalated} className="dm-b">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">ESCALATION</span><b>Billing team</b><span className="mk-sub">Summary + context attached</span></div>
      </Dock>
      <Dock on={s >= 4} className="dm-c">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">AGENT-ASSIST DRAFT</span><Bubble>Apologies for the double charge — refunding now.</Bubble></div>
      </Dock>
    </div>
  );
}
