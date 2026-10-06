import { AlertTriangle, BarChart3, Bell, Check, FileText, Film, Mic, ShieldCheck, Ticket, Wrench } from "lucide-react";

/** Real application surfaces for each AI scenario. Everything is driven by the number of steps already played. */
const on = (step: number, at: number) => step >= at;

export function SupportApp({ step }: { step: number }) {
  const flagged = step >= 5 && step < 6;
  return (
    <div className="ap ap-sup">
      <div className="ap-sup__main">
        <div className="ap-msg" data-on={on(step, 1)}><span className="ap-av">MR</span><p>Hi, my order A-1042 arrived damaged. I would like a refund.</p></div>
        <div className="ap-sup__cards">
          <div className="ap-card" data-on={on(step, 2)}><b className="mono">POLICY</b><p>Refunds within 30 days</p><em data-ok><Check />Eligible</em></div>
          <div className="ap-card" data-on={on(step, 3)}><b className="mono">ORDER A-1042</b><p>Delivered 12 days ago</p><em>$240.00</em></div>
        </div>
        <div className="ap-tool mono" data-on={on(step, 4)}><Wrench />refund.create(order: A-1042, amount: 240)</div>
        <div className="ap-appr" data-on={on(step, 5)} data-flag={flagged} data-ok={step >= 6}>
          {step >= 6 ? <><ShieldCheck />Approved by a person</> : <><AlertTriangle />Over the agent limit ($100): needs a person</>}
        </div>
        <div className="ap-msg ap-msg--out" data-on={on(step, 7)}><span className="ap-av ap-av--s">SB</span><p>Your refund of $240 is on its way. You will see it in 3 to 5 days.</p></div>
      </div>
      <aside className="ap-sup__side"><Ticket /><b className="mono">TICKET 4821</b><span data-on={on(step, 7)}>Resolved</span></aside>
    </div>
  );
}

export function DocumentApp({ step }: { step: number }) {
  const missing = step >= 4 && step < 5;
  const fields: [string, string, number][] = [["Supplier", "Northfield Logistics", 3], ["Term", "24 months", 3], ["Value", "$86,400", 3], ["Start date", step >= 5 ? "1 Mar" : "Missing", 4]];
  return (
    <div className="ap ap-doc">
      <div className="ap-pdf" data-read={on(step, 2)}>
        <b className="mono"><FileText />supplier-contract.pdf</b>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} data-hl={on(step, 3) && (i === 1 || i === 3 || i === 4 || (i === 6 && step >= 5))} />)}
        <span className="ap-scan" data-on={step === 2} />
      </div>
      <div className="ap-doc__out">
        <b className="mono">EXTRACTED FIELDS</b>
        {fields.map(([k, v, at]) => (
          <div key={k} className="ap-row" data-on={on(step, at)} data-flag={k === "Start date" && missing}>
            <span>{k}</span><em>{v}</em>{k === "Start date" && missing ? <AlertTriangle aria-hidden /> : on(step, at + (k === "Start date" ? 1 : 0)) ? <Check aria-hidden /> : null}
          </div>
        ))}
        <pre className="ap-json mono" data-on={on(step, 6)}>{'{ "supplier": "Northfield Logistics",\n  "term_months": 24,\n  "start": "2026-03-01" }'}</pre>
      </div>
    </div>
  );
}

export function MediaApp({ step }: { step: number }) {
  return (
    <div className="ap ap-med">
      <div className="ap-med__frames">
        {Array.from({ length: 9 }, (_, i) => <i key={i} data-sel={on(step, 2) && [1, 4, 7].includes(i)} data-on={on(step, 1)} />)}
        <b className="mono"><Film />WEBINAR 42:00 · 9 SCENES</b>
      </div>
      <div className="ap-med__script" data-on={on(step, 3)}><b className="mono">SCRIPT DRAFT V1 · 45 SEC</b><p>Three things most teams get wrong about onboarding, and what to do instead.</p></div>
      <div className="ap-track" data-on={on(step, 4)}>
        <span className="ap-track__l mono"><Mic />VOICE + CAPTIONS</span>
        <div className="ap-track__bar">{["a", "b", "c"].map((k, i) => <i key={k} data-on={on(step, 5)} style={{ ["--i" as string]: i }} />)}</div>
      </div>
      <div className="ap-pub" data-on={on(step, 7)}><Check />Published to 3 channels</div>
    </div>
  );
}

export function IntelligenceApp({ step }: { step: number }) {
  const pts = [32, 40, 36, 48, 44, 58, 52, 66, 61, 78];
  const shown = step >= 1 ? Math.min(pts.length, 3 + step * 2) : 2;
  const path = pts.slice(0, shown).map((y, i) => `${i === 0 ? "M" : "L"}${(i * 220) / (pts.length - 1)},${100 - y}`).join(" ");
  return (
    <div className="ap ap-int">
      <div className="ap-int__chart"><b className="mono"><BarChart3 />LIVE FEED · 4 SOURCES</b>
        <svg viewBox="0 0 220 100" preserveAspectRatio="none"><line x1="0" y1="30" x2="220" y2="30" data-on={on(step, 4)} /><path d={path} /></svg>
        <span className="ap-int__hist" data-on={on(step, 3)}>90 days compared</span>
      </div>
      <div className="ap-int__score" data-on={on(step, 4)}><b className="mono">SCORE</b><strong>0.82</strong><em>above threshold 0.70</em></div>
      <div className="ap-int__risk" data-on={on(step, 5)}><ShieldCheck />Risk check passed</div>
      <div className="ap-int__alert" data-on={on(step, 6)}><Bell />Alert sent to the team</div>
    </div>
  );
}
