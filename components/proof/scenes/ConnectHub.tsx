"use client";
import { CreditCard, Database, Mail, Users } from "lucide-react";
import { Bars, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useCount, useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

const EVENTS = [
  { icon: CreditCard, label: "Payment received", sys: "payments" },
  { icon: Users, label: "CRM record updated", sys: "crm" },
  { icon: Mail, label: "Receipt email sent", sys: "email" },
  { icon: Database, label: "Analytics event stored", sys: "data" },
];

export function ConnectHub({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 800, 1700, 2600, 3500, 4600, 5600], playing, reduced);
  const shown = Math.min(4, s);
  const verified = Math.max(0, Math.min(4, s - 1));
  const synced = useCount(s >= 6 ? 1204 : s >= 4 ? 1200 : 1196, 700, reduced);
  return (
    <div className="dm">
      <SceneWindow title="ConnectHub · Event log" status={<StatusChip tone={verified >= 4 ? "green" : "amber"}>{verified >= 4 ? "ALL SYNCED" : "SYNCING"}</StatusChip>}>
        <ul className="dm-events">
          {EVENTS.map((e, i) => (
            <li key={e.label} data-on={i < shown} data-ok={i < verified}>
              <e.icon aria-hidden />
              <span className="dm-events__t"><b>{e.label}</b><em className="mono">evt_{1040 + i} · {e.sys}</em></span>
              <Pill tone={i < verified ? "green" : "amber"}>{i < verified ? "Verified" : "Pending"}</Pill>
            </li>
          ))}
        </ul>
      </SceneWindow>
      <Dock on={s >= 1} className="dm-a">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">CONNECTED SYSTEMS</span>
          <div className="mk-row dm-chips"><Pill tone="green">Payments</Pill><Pill tone="green">CRM</Pill><Pill tone={s >= 3 ? "green" : "amber"}>Email</Pill></div>
        </div>
      </Dock>
      <Dock on={s >= 2} className="dm-b">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">DATA MAPPING</span>
          <div className="dm-map"><span>amount</span><span>deal.value</span><span>email</span><span>contact.email</span></div>
        </div>
      </Dock>
      <Dock on={s >= 4} className="dm-c">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">EVENTS SYNCED</span>
          <b className="dm-big tnum">{synced.toLocaleString("en-US")}</b>
          <Bars values={[30, 45, 38, 60, 52, 78, 90]} tone="cyan" />
        </div>
      </Dock>
    </div>
  );
}
