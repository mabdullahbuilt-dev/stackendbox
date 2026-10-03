import { BarChart3, Bell, Calendar, CreditCard, Database, KeyRound, MessageSquare, Server, Smartphone, UsersRound, Workflow } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Pill } from "@/components/ui/mock";

/** One distinct visual per service. Pure DOM/CSS; hover responds with transform and opacity only. */
export function SaasVisual() {
  return (
    <div className="sv sv-saas" aria-hidden>
      <div className="sv-browser">
        <div className="sv-bar"><i /><i /><i /><b /></div>
        <div className="sv-app"><aside><i /><i /><i /></aside><div><b /><div className="sv-tiles"><i /><i /><i /></div><div className="sv-bars"><i style={{ height: "40%" }} /><i style={{ height: "62%" }} /><i style={{ height: "48%" }} /><i style={{ height: "80%" }} /><i style={{ height: "66%" }} /></div></div></div>
      </div>
      <div className="sv-phone"><i /><b /><i /><i /><u /></div>
      <span className="sv-dock sv-dock--a"><KeyRound />Auth</span>
      <span className="sv-dock sv-dock--b"><CreditCard />Billing</span>
      <span className="sv-dock sv-dock--c"><Database />Data</span>
    </div>
  );
}
export function WebVisual() {
  return (
    <div className="sv sv-web" aria-hidden>
      <div className="sv-dev sv-dev--d"><i /><i /><i /></div>
      <div className="sv-dev sv-dev--t"><i /><i /></div>
      <div className="sv-dev sv-dev--p"><i /><i /></div>
    </div>
  );
}
export function AiVisual() {
  return (
    <div className="sv sv-ai" aria-hidden>
      <div className="sv-msg sv-msg--u">Summarize this contract</div>
      <div className="sv-tool"><Server />search_documents<Pill tone="green">done</Pill></div>
      <div className="sv-tool"><Database />extract_clauses<Pill tone="green">done</Pill></div>
      <div className="sv-msg sv-msg--a">3 clauses need review</div>
      <div className="sv-approve"><span>Approve</span><span>Edit</span></div>
    </div>
  );
}
export function AutomationVisual() {
  const steps = [
    { icon: UsersRound, t: "New lead" },
    { icon: BarChart3, t: "Qualified" },
    { icon: MessageSquare, t: "Message sent" },
    { icon: Calendar, t: "Meeting booked" },
  ];
  return (
    <div className="sv sv-auto" aria-hidden>
      {steps.map((s, i) => (
        <div key={s.t} className="sv-step" style={{ ["--i" as string]: i }}>
          <s.icon /><span>{s.t}</span><u />
        </div>
      ))}
    </div>
  );
}
export function CrmVisual() {
  return (
    <div className="sv sv-crm" aria-hidden>
      {["New", "Qualified", "Won"].map((c, i) => (
        <div key={c} className="sv-col"><b>{c}</b>{Array.from({ length: 3 - i }).map((_, k) => <i key={k} />)}</div>
      ))}
      <Bell className="sv-bell" />
    </div>
  );
}
export function ApiVisual() {
  return (
    <div className="sv sv-api" aria-hidden>
      <div className="sv-hub"><Workflow /></div>
      <span className="sv-logo sv-logo--a"><BrandIcon name="stripe" size={22} /></span>
      <span className="sv-logo sv-logo--b"><BrandIcon name="hubspot" size={22} /></span>
      <span className="sv-logo sv-logo--c"><BrandIcon name="whatsapp" size={22} /></span>
      <span className="sv-logo sv-logo--d"><BrandIcon name="supabase" size={22} /></span>
      <span className="sv-logo sv-logo--e"><BrandIcon name="gcal" size={22} /></span>
    </div>
  );
}
export function CustomVisual() {
  return (
    <div className="sv sv-custom" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ ["--i" as string]: i }} />)}
      <Smartphone className="sv-cust-ic" />
    </div>
  );
}
