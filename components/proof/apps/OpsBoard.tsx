import { Lock } from "lucide-react";

export const OPSBOARD_STEPS = 6;
const COLS = ["Intake", "In progress", "Approval", "Done"] as const;
/** Column of the moving card for each step. */
const AT = [0, 0, 1, 2, 2, 3, 3];

/** Operations as a board: one customer project moves through intake, work, approval and done, with owners on cards. */
export function OpsBoard({ step }: { step: number }) {
  const col = AT[Math.min(step, AT.length - 1)];
  const others: [number, string, string][] = [[0, "Corvid onboarding", "LE"], [1, "Harbor redesign", "MA"], [1, "Atlas migration", "IN"], [3, "Delta handover", "JO"], [3, "Eastgate audit", "MA"]];
  return (
    <div className="bw bw-board">
      <header className="bw-top"><b><i className="bw-dot" />OpsBoard</b><span>Delivery board · 6 projects</span><em data-ok={step >= 6}>{step >= 6 ? "AUDIT LOGGED" : "LIVE BOARD"}</em></header>
      <div className="bw-cols">
        {COLS.map((c, i) => (
          <div key={c} className="bw-col" data-hot={i === col}>
            <b className="mono">{c.toUpperCase()}<span>{others.filter(([k]) => k === i).length + (i === col ? 1 : 0)}</span></b>
            {i === col && (
              <div className="bw-card bw-card--move" key={`m${col}`} data-appr={col === 2}>
                <strong>Northwind rollout</strong>
                <span>{col === 0 ? "New request from Northwind Ltd" : col === 1 ? "Sam assigned, 4 tasks" : col === 2 ? "Budget $18,400 needs Finance" : "Approved, delivered, reported"}</span>
                <div className="bw-card__f">{col === 2 && <em className="bw-lock"><Lock aria-hidden />{step >= 4 ? "Approved" : "Waiting"}</em>}<u data-on={col >= 1}>{col >= 1 ? "SA" : "?"}</u></div>
              </div>
            )}
            {others.filter(([k]) => k === i).map(([, t, o]) => <div key={t} className="bw-card"><strong>{t}</strong><div className="bw-card__f"><u>{o}</u></div></div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
