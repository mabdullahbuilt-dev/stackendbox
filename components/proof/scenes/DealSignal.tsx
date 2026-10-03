"use client";
import { Bell, Search } from "lucide-react";
import { Pill } from "@/components/ui/mock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useCount, useSteps } from "@/lib/useSteps";
import { PropertyPhoto } from "./PropertyPhoto";
import { Dock, SceneWindow, type SceneProps } from "./shared";

const FACTORS: [string, number][] = [["Visual condition", 24], ["Seller urgency", 21], ["Market activity", 16], ["Property signals", 14], ["Other indicators", 9]];

export function DealSignal({ playing, reduced }: SceneProps) {
  const s = useSteps([0, 800, 1700, 2600, 3700, 4600, 5500], playing, reduced);
  const shown = s < 3 ? 0 : Math.min(5, s === 3 ? 3 : 5);
  const total = FACTORS.slice(0, shown).reduce((a, [, v]) => a + v, 0);
  const score = useCount(s >= 4 ? 84 : total, 800, reduced);
  const qualified = s >= 4 && score >= 75;
  return (
    <div className="dm">
      <SceneWindow title="DealSignal" status={<StatusChip tone={s >= 6 ? "green" : qualified ? "blue" : "amber"}>{s >= 6 ? "ALERT SENT" : qualified ? "QUALIFIED" : s >= 1 ? "ANALYZING" : "NEW PROPERTY"}</StatusChip>}>
        <div className="ds">
          <div className="ds-prop">
            <div className="ds-ph"><PropertyPhoto kind="house" />{s >= 1 && <><span className="ds-box ds-box--a">Roof wear</span><span className="ds-box ds-box--b">Dated entrance</span></>}{s === 1 && <i className="lr-scan" />}</div>
            <div className="ds-thumbs"><PropertyPhoto kind="kitchen" tone={1} /><PropertyPhoto kind="bath" /><PropertyPhoto kind="living" tone={1} /></div>
            <p className="ds-text">
              Spacious 4 bed home, <mark data-on={s >= 2}>needs updating</mark> throughout. <mark data-on={s >= 2}>Motivated seller</mark>, sold <mark data-on={s >= 2}>as is</mark>. Priced to move.
            </p>
          </div>
          <div className="ds-score">
            <span className="mono mono--muted"><Search className="mk-inl" /> OPPORTUNITY SCORE</span>
            <b className="dm-big tnum">{score}</b>
            <div className="ds-gauge"><i style={{ width: `${score}%` }} /><u /><em className="mono">75</em></div>
            <ul>
              {FACTORS.map(([k, v], i) => <li key={k} data-on={i < shown}><span>{k}</span><b className="tnum">+{v}</b></li>)}
            </ul>
          </div>
        </div>
      </SceneWindow>
      <Dock on={s >= 5} className="dm-a">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">QUALIFIED LIST</span><div className="mk-row"><b>14 Alder Row</b><Pill tone="green">84</Pill></div><span className="mk-sub">Added automatically</span></div>
      </Dock>
      <Dock on={s >= 6} className="dm-b">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted"><Bell className="mk-inl" /> ALERT</span><b>New opportunity</b><span className="mk-sub">14 Alder Row scored 84</span></div>
      </Dock>
      <Dock on={s >= 3} className="dm-c">
        <div className="mk-mini mk-mini--col"><span className="mono mono--muted">WHY THIS SCORE</span><span className="mk-sub">Every point is explained: condition from photos, urgency from listing language, activity from market signals.</span></div>
      </Dock>
    </div>
  );
}
