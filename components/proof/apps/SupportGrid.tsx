import { BookOpen, Inbox, Sparkles, Ticket, Zap } from "lucide-react";
import { AppShell, Av, Chip } from "./Shell";

export const SUPPORTGRID_STEPS = 6;

export function SupportGrid({ step }: { step: number }) {
  const conf = step >= 4 ? 92 : step >= 3 ? 74 : step >= 2 ? 58 : 0;
  const tone = step >= 4 ? "ok" : step >= 3 ? "run" : "bad";
  return (
    <AppShell
      name="SupportGrid" active={0} title="Inbox"
      nav={[[Inbox, "Inbox"], [Ticket, "Tickets"], [BookOpen, "Knowledge"], [Zap, "Automations"], [Sparkles, "AI activity"]]}
      top={<Chip tone={step >= 6 ? "ok" : "run"}>{step >= 6 ? "Resolved" : "Open"}</Chip>}
      rail={
        <div className="pa-card pa-ai">
          <b className="mono">AI ASSIST</b>
          <ul className="pa-src">
            <li data-on={step >= 1}><BookOpen aria-hidden />Refund policy{step >= 2 && <Chip tone="ok">Found</Chip>}</li>
            <li data-on={step >= 1}><Ticket aria-hidden />Order 5521{step >= 2 && <Chip tone="ok">Checked</Chip>}</li>
          </ul>
          <div className="pa-conf"><span>Confidence</span><div><i style={{ width: `${conf}%` }} data-tone={tone} /></div><b className="tnum">{conf ? `${conf}%` : "..."}</b></div>
          {step >= 4 && step < 6 && <div className="pa-appr"><Chip tone="run">Needs approval</Chip><span><button type="button" tabIndex={-1} data-p={step >= 5}>{step >= 5 ? "Approved" : "Approve"}</button><button type="button" tabIndex={-1}>Edit</button></span></div>}
          {step >= 6 && <Chip tone="ok">Refund issued</Chip>}
        </div>
      }
    >
      <div className="pa-inbox">
        {[["Duplicate charge", "Customer wants a refund", "C", true], ["Login help", "Reset link expired", "D", false], ["Invoice copy", "Needs PDF", "E", false]].map(([t, s, a, sel]) => (
          <div key={String(t)} className="pa-msg" data-sel={sel}><Av>{a as string}</Av><div><b>{t as string}</b><span>{s as string}</span></div></div>
        ))}
      </div>
      <div className="pa-ticket">
        <div className="pa-bubble"><Av>C</Av><p>I was charged twice for order 5521. Can I get a refund?</p></div>
        {step >= 5 && <div className="pa-bubble pa-bubble--ai"><Av tone="accent">AI</Av><p>The duplicate charge is refunded. You will get a confirmation email.</p></div>}
      </div>
    </AppShell>
  );
}
