"use client";
import { Bubble, Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSteps } from "@/lib/useSteps";
import { Dock, SceneWindow, type SceneProps } from "./shared";

const TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
const TABLES = ["T1", "T2", "T3", "T4", "T5", "T6"];
// pre-filled cells: table index to set of time indices
const TAKEN: Record<number, number[]> = { 0: [0, 1, 4], 1: [2, 3], 2: [1], 3: [0, 5], 4: [3, 4], 5: [2] };

export function TablePilot({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 900, 2000, 3200, 4400, 5600], playing, reduced);
  const target = { r: 3, c: 3 }; // T4 · 19:30
  return (
    <div className="dm">
      <SceneWindow title="TablePilot · Reservations" status={<StatusChip tone={s >= 5 ? "green" : s >= 3 ? "amber" : "muted"}>{s >= 5 ? "CONFIRMED" : s >= 3 ? "HOLDING SLOT" : "LIVE"}</StatusChip>}>
        <div className="dm-res">
          <div className="dm-res__head"><span />{TIMES.map((t) => <span key={t} className="mono mono--muted">{t}</span>)}</div>
          {TABLES.map((t, r) => (
            <div key={t} className="dm-res__row">
              <span className="mono mono--muted">{t}</span>
              {TIMES.map((_, c) => {
                const taken = TAKEN[r]?.includes(c);
                const isT = r === target.r && c === target.c;
                const state = isT ? (s >= 4 ? "filled" : s >= 2 ? "hold" : "free") : taken ? "taken" : "free";
                return <i key={c} className="dm-cell" data-state={state} data-target={isT && s >= 2} />;
              })}
            </div>
          ))}
        </div>
      </SceneWindow>
      <Dock on={s >= 1} className="dm-a">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">GUEST MESSAGE</span>
          <Bubble me>Table for 4 at 19:30?</Bubble>
          {s >= 3 && <Bubble tone="green">T4 is free. Book it?</Bubble>}
        </div>
      </Dock>
      <Dock on={s >= 2} className="dm-b">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">AVAILABILITY</span>
          <div className="mk-row"><b>T4 · 19:30</b><Pill tone={s >= 4 ? "green" : "cyan"}>{s >= 4 ? "Booked" : "Free"}</Pill></div>
        </div>
      </Dock>
      <Dock on={s >= 5} className="dm-c">
        <div className="mk-mini mk-mini--col">
          <span className="mono mono--muted">ORDER TICKET</span>
          <div className="mk-row"><b>Table 4 · party of 4</b><Pill tone="green">Confirmed</Pill></div>
          <span className="mk-sub">Confirmation sent · pre-order open</span>
        </div>
      </Dock>
    </div>
  );
}
