import { Check, CreditCard, KeyRound, Server } from "lucide-react";
import { Avatar, Line, Pill } from "@/components/ui/mock";
import { copy } from "@/content/copy";

const flow = ["Browse services", "Pick a time", "Pay online", "Get confirmation", "Manage bookings"];
const slots = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];

/** Design space (760x470) layers for the idea to product story. Animated by GSAP in IdeaToProduct. */
export function IdeaStage() {
  return (
    <div className="ip">
      {/* 01 BRIEF, 02 STRUCTURE */}
      <div className="ip-brief"><b className="mono">BRIEF</b><p>{copy.product.brief}</p></div>
      <ol className="ip-flow">{flow.map((f, i) => <li key={f}><span className="mono">{i + 1}</span>{f}</li>)}</ol>
      <div className="ip-briefdone mono" data-done><Check className="mk-inl" /> Brief</div>

      {/* 08 ADMIN sits behind-right */}
      <div className="ip-admin">
        <div className="window__bar"><span className="window__title">Admin · Bookings</span></div>
        <div className="ip-admin__rows">
          {[["Maya Chen", "Haircut", "Confirmed"], ["Sam Ortiz", "Consult", "Paid"], ["Riya Das", "Colour", "Confirmed"], ["Alex Kim", "Haircut", "Pending"]].map(([n, s, st]) => (
            <div key={n} className="mk-trow"><Avatar>{n[0]}</Avatar><span>{n} · {s}</span><Pill tone={st === "Pending" ? "amber" : "green"}>{st}</Pill></div>
          ))}
        </div>
        <span className="ip-cap mono">ADMIN</span>
      </div>
      {/* 05 BACKEND behind the window */}
      <div className="ip-schema">
        <div className="mk-row"><b className="mono">DATABASE</b><Pill tone="cyan">postgres</Pill></div>
        <div className="ip-tables">
          {[["customers", 7], ["services", 5], ["bookings", 11], ["payments", 8]].map(([t, n]) => <div key={t}><b className="mono">{t}</b><span className="mono mono--muted">{n} fields</span></div>)}
        </div>
      </div>

      {/* 03 WIREFRAME and 04 INTERFACE */}
      <div className="ip-win ip-wire">
        <div className="ip-wire__in"><i className="wb wb--side" /><i className="wb wb--h" /><i className="wb wb--t" /><i className="wb wb--t" /><i className="wb wb--t" /><i className="wb wb--big" /><i className="wb wb--row" /></div>
      </div>
      <div className="ip-win ip-ui window">
        <div className="window__bar">
          <span className="window__dots" aria-hidden><i /><i /><i /></span>
          <span className="window__title">Book an appointment</span>
          <span className="ip-live" style={{ marginLeft: "auto" }}><Pill tone="green">LIVE</Pill></span>
        </div>
        <div className="ip-book">
          <div className="ip-book__svc">
            {["Haircut", "Consultation", "Colour"].map((t, i) => <div key={t} data-on={i === 0}><b>{t}</b><span className="mk-sub">{[45, 30, 90][i]} min</span></div>)}
          </div>
          <div className="ip-book__slots"><b>Tuesday</b><div>{slots.map((t, i) => <span key={t} data-on={i === 3}>{t}</span>)}</div><u>Confirm and pay</u></div>
        </div>
      </div>
      <i className="ip-edge" />

      {/* 09 MOBILE */}
      <div className="ip-phone">
        <b>Book</b><Line w="70%" /><div>{slots.slice(0, 4).map((t, i) => <span key={t} data-on={i === 2}>{t}</span>)}</div><u>Pay and confirm</u>
      </div>

      {/* docked parts */}
      <div className="ip-auth ip-part"><span className="mk-mini__ic"><KeyRound /></span><span><b>Sign in</b><em className="mono">ROLES · ACCESS</em></span></div>
      <div className="ip-api ip-part"><span className="mono mono--muted">API · GET /bookings</span><span className="mono ip-api__code">{`{ "status": `}<b>200</b>{` }`}</span></div>
      <div className="ip-bill ip-part"><span className="mk-mini__ic"><CreditCard /></span><span><b>Payments</b><em className="mono">SUBSCRIPTION · ACTIVE</em></span></div>
      <div className="ip-deploy ip-part"><Server /><span className="mono">PRODUCTION · BUILD PASSED</span><Pill tone="green">LIVE</Pill></div>
    </div>
  );
}
