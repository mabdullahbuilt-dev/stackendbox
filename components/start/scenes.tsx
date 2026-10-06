import { AlertTriangle, Bell, Bot, CalendarDays, Check, ClipboardList, Copy, CreditCard, Database, FileText, KeyRound, LayoutTemplate, Lock, Mail, MessageSquare, Plug, Rocket, ShieldCheck, Smartphone, Table2, UserCheck, X, FlaskConical, Server, Boxes } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import type { StartId } from "@/content/starts";

const I = (n: number) => ({ ["--i" as string]: n });

function Idea() {
  return (
    <div className="sp sp-idea">
      <div className="sp-note" style={I(0)}><span className="mono">THE IDEA</span><p>A portal where clients submit work and pay online<i className="mk-caret" /></p></div>
      <ul className="sp-reqs" aria-hidden>{["Clients log in", "Submit a request", "Pay online"].map((t, i) => <li key={t} style={I(i + 1)}><i />{t}</li>)}</ul>
      <div className="sp-trail" style={I(1)} aria-hidden />
      <div className="sp-phone" style={I(2)}>
        <div className="sp-phone__bar" />
        <div className="sp-sk sp-sk--hero" style={I(3)} />
        <div className="sp-sk" style={I(4)} /><div className="sp-sk sp-sk--s" style={I(5)} />
        <div className="sp-sk sp-sk--btn" style={I(6)} />
        <span className="sp-dim mono">375 PX</span>
      </div>
    </div>
  );
}
function Mvp() {
  const core = [["Sign in", KeyRound], ["Booking", CalendarDays], ["Payments", CreditCard]] as const;
  const later = [["Reports", Table2], ["Referrals", MessageSquare], ["Mobile app", Smartphone]] as const;
  return (
    <div className="sp sp-mvp">
      <div className="sp-map">
        <div className="sp-v1"><span className="mono mono--muted">V1 BOUNDARY</span>{core.map(([t, Ic], i) => <b key={t} className="sp-feat sp-feat--on" style={I(i)}><Ic aria-hidden />{t}<Check aria-hidden /></b>)}</div>
        <div><span className="mono mono--muted">LATER</span>{later.map(([t, Ic], i) => <b key={t} className="sp-feat" style={I(i + 3)}><Ic aria-hidden />{t}</b>)}</div>
      </div>
      <div className="sp-flow" aria-hidden>
        {[LayoutTemplate, CalendarDays, CreditCard].map((Ic, i) => <span key={i} className="sp-screen" style={I(i + 6)}><Ic /></span>)}
        <em className="sp-live" style={I(9)}><i /> LIVE</em>
      </div>
    </div>
  );
}
function Prototype() {
  return (
    <div className="sp sp-proto">
      <div className="sp-rough" style={I(0)} aria-hidden><i /><i /><i /><b className="mono">ROUGH</b><em className="sp-miss mono">MISSING STATE</em><em className="sp-mis mono">MISALIGNED</em></div>
      <div className="sp-clean" style={I(2)} aria-hidden>
        <div className="sp-clean__bar"><i /><i /><i /></div>
        <div className="sp-clean__body"><aside><i /><i /><i /></aside><div><u /><u /><u /><span /></div></div>
        <b className="mono sp-ok"><Check aria-hidden /> STRUCTURED</b>
      </div>
    </div>
  );
}
function Existing() {
  const layers = [["Interface", LayoutTemplate, "ok"], ["Auth", KeyRound, "bad"], ["API", Plug, "ok"], ["Tests", FlaskConical, "bad"]] as const;
  return (
    <div className="sp sp-exist">
      <div className="sp-app" style={I(0)} aria-hidden><div className="sp-app__bar"><i /><i /><i /></div><div className="sp-app__body"><u /><u /><u /></div><span className="sp-pin sp-pin--a mono">SLOW LOAD</span><span className="sp-pin sp-pin--b mono">NO MOBILE</span></div>
      <ul className="sp-layers">
        {layers.map(([t, Ic, st], i) => <li key={t} data-st={st} style={I(i + 1)}><Ic aria-hidden />{t}{st === "ok" ? <Check aria-label="healthy" /> : <AlertTriangle aria-label="needs work" />}</li>)}
      </ul>
    </div>
  );
}
function Manual() {
  const tiles = [[Mail, "Inbox", "WAITING", "warn"], [Table2, "Sheet", "DUPLICATE", "bad"], [MessageSquare, "Chat", "UNREAD", "warn"], [CalendarDays, "Calendar", "CONFLICT", "bad"], [FileText, "Document", "OUTDATED", "warn"]] as const;
  return (
    <div className="sp sp-manual">
      {tiles.map(([Ic, t, badge, st], i) => (
        <div key={t} className={`sp-tile sp-tile--${i}`} data-st={st} style={I(i)}>
          <span className="sp-tile__ic"><Ic aria-hidden /></span><b>{t}</b><i /><i />
          <em className="mono">{st === "bad" ? <X aria-hidden /> : <Bell aria-hidden />}{badge}</em>
        </div>
      ))}
      <span className="sp-copy" style={I(6)}><Copy aria-hidden /> copy and paste</span>
    </div>
  );
}
function Systems() {
  const nodes = [["stripe", "Payments"], ["hubspot", "CRM"], ["whatsapp", "Messages"], ["gcal", "Calendar"], ["supabase", "Database"]] as const;
  return (
    <div className="sp sp-sys">
      <div className="sp-sys__core" style={I(0)}><span>?</span><em className="mono">NO SHARED RECORD</em></div>
      {nodes.map(([k, t], i) => (
        <div key={k} className={`sp-brand sp-brand--${i}`} style={I(i + 1)}>
          <BrandIcon name={k} size={26} /><b>{t}</b>
          <AlertTriangle className="sp-brand__x" aria-label="not connected" />
        </div>
      ))}
    </div>
  );
}
function Ai() {
  const steps = [[FileText, "Documents", "src"], [Bot, "Model", "run"], [Plug, "Tool call", "run"], [UserCheck, "Approval", "ok"]] as const;
  return (
    <div className="sp sp-ai">
      {steps.map(([Ic, t, st], i) => (
        <div key={t} className="sp-step" data-st={st} style={I(i * 2)}>
          <span><Ic aria-hidden /></span><b>{t}</b>
          {st === "ok" && <Check className="sp-step__ok" aria-label="approved" />}
          {i < steps.length - 1 && <i className="sp-link" style={I(i * 2 + 1)} aria-hidden />}
        </div>
      ))}
      <div className="sp-ai__out" style={I(8)}><ShieldCheck aria-hidden /> Action completed, result stored</div>
    </div>
  );
}
function Custom() {
  const slots = ["m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7"];
  return (
    <div className="sp sp-custom">
      <div className="sp-need" style={I(0)}><ClipboardList aria-hidden /><div><span className="mono">WHAT NEEDS TO WORK?</span><b>A tool that does not exist yet</b></div></div>
      <ul className="sp-cands mono" aria-hidden>{["WORKFLOW", "DATA MODEL", "ROLES", "API", "REPORTING"].map((t, i) => <li key={t} style={I(i + 9)}>{t}</li>)}</ul>
      <div className="sp-grid">
        {slots.map((s, i) => {
          const filled = [1, 2, 4, 6].includes(i);
          const lock = [2, 6].includes(i);
          return <span key={s} className="sp-slot" data-on={filled} data-lock={lock} style={I(i + 1)}>{filled && (i === 1 ? <Database aria-hidden /> : i === 2 ? <Lock aria-hidden /> : i === 4 ? <Boxes aria-hidden /> : <Server aria-hidden />)}</span>;
        })}
      </div>
    </div>
  );
}
export const startScenes: Record<StartId, () => React.JSX.Element> = { idea: Idea, mvp: Mvp, prototype: Prototype, existing: Existing, manual: Manual, systems: Systems, ai: Ai, custom: Custom };
void Rocket;
