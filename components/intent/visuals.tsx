import { Bot, Braces, Calendar, Check, CreditCard, Database, FileText, KeyRound, MessageSquare, PackageCheck, Server, ShieldCheck, UserCheck, UsersRound, Workflow, Zap } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Avatar, Bars, Line, Pill, Tile } from "@/components/ui/mock";
import { systems } from "@/content/integrations";

const d = (i: number) => ({ ["--i" as string]: i });

export function SaasViz() {
  return (
    <div className="iv iv-saas">
      <div className="iv-browser" style={d(0)}>
        <div className="iv-chrome"><i /><i /><i /><b>app.yourproduct.com</b></div>
        <div className="mk-app"><aside><span className="mono">Y</span><UsersRound /><CreditCard /><Server /></aside>
          <div className="mk-app__main"><div className="mk-row"><b>Dashboard</b><Pill tone="green">Live</Pill></div>
            <div className="mk-tiles"><Tile label="USERS" value="1,284" /><Tile label="PLANS" value="3" tone="cyan" /><Tile label="SEATS" value="8/10" /></div>
            <Bars values={[30, 48, 40, 66, 58, 82, 72]} /></div></div>
      </div>
      <div className="iv-phone" style={d(1)}><i /><b /><i /><i /><u /></div>
      {[[KeyRound, "Sign in"], [CreditCard, "Billing"], [Database, "Database"], [ShieldCheck, "Admin"], [PackageCheck, "Deployed"]].map(([I, t], k) => {
        const Icon = I as typeof KeyRound;
        return <span key={t as string} className={`iv-chip iv-chip--${k}`} style={d(k + 2)}><Icon />{t as string}</span>;
      })}
    </div>
  );
}

export function MvpViz() {
  const steps = [
    ["Idea", "One sentence, one user, one problem.", 18],
    ["Scope", "Only the features the first release needs.", 38],
    ["Prototype", "Clickable screens, tested early.", 58],
    ["Working core", "The main flow built end to end.", 80],
    ["Launch", "Deployed, with real users.", 100],
  ] as const;
  return (
    <div className="iv iv-mvp">
      {steps.map(([t, s, p], i) => (
        <div key={t} className="iv-stair" style={{ ...d(i), ["--h" as string]: `${p}%` }}>
          <span className="mono">{String(i + 1).padStart(2, "0")}</span>
          <b>{t}</b>
          <em>{s}</em>
          <u><i /></u>
        </div>
      ))}
    </div>
  );
}

export function AiViz() {
  const rows = [
    [MessageSquare, "Request", "Summarize this contract and flag risks", null],
    [FileText, "Retrieval", "3 documents found", "cyan"],
    [Bot, "Model", "Reads context, plans the steps", "blue"],
    [Zap, "Tool call", "extract_clauses()", "green"],
    [Database, "Data", "Clause library queried", "cyan"],
    [UserCheck, "Human approval", "Waiting for review", "amber"],
    [Check, "Action", "Summary saved to the matter", "green"],
  ] as const;
  return (
    <div className="iv iv-ai">
      {rows.map(([I, t, s, tone], i) => (
        <div key={t} className="iv-row" style={d(i)}>
          <span className="iv-row__ic"><I /></span>
          <b>{t}</b><em>{s}</em>
          {tone && <Pill tone={tone}>{tone === "amber" ? "pending" : "ok"}</Pill>}
        </div>
      ))}
    </div>
  );
}

export function AutoViz() {
  const lane = [[UsersRound, "Incoming"], [Sparkles2, "Qualify"], [Workflow, "Route"], [MessageSquare, "Message"], [Calendar, "Book"], [UsersRound, "CRM"], [Bars2, "Report"]] as const;
  return (
    <div className="iv iv-auto">
      <div className="iv-lane">
        {lane.map(([I, t], i) => (
          <div key={t} className="iv-slot" style={d(i)}><I /><span>{t}</span></div>
        ))}
        <div className="iv-token"><b>Maya Chen</b><em>new lead</em></div>
      </div>
      <div className="iv-log">
        {["Lead received from website", "Scored 82 out of 100", "Assigned to Sam", "Follow up message drafted", "Meeting booked for Thursday", "CRM and report updated"].map((t, i) => (
          <p key={t} style={d(i)}><i />{t}</p>
        ))}
      </div>
    </div>
  );
}
function Sparkles2(p: React.SVGProps<SVGSVGElement>) { return <Zap {...p} />; }
function Bars2(p: React.SVGProps<SVGSVGElement>) { return <Braces {...p} />; }

export function CrmViz() {
  return (
    <div className="iv iv-crm">
      <div className="iv-contacts" style={d(0)}>
        <b className="mono">CONTACTS</b>
        {["Maya Chen", "Northwind", "Studio 12", "Orbit retail"].map((n, i) => <div key={n} className="iv-contact"><Avatar>{n[0]}</Avatar><span>{n}</span><Pill tone={i === 0 ? "blue" : "muted"}>{["Qualified", "New", "Proposal", "Won"][i]}</Pill></div>)}
      </div>
      <div className="iv-pipe" style={d(1)}>
        {["New", "Qualified", "Proposal", "Won"].map((c, i) => <div key={c} className="iv-pcol"><b className="mono">{c}</b>{Array.from({ length: 4 - i }).map((_, k) => <i key={k} />)}</div>)}
      </div>
      <div className="iv-side" style={d(2)}>
        <div className="iv-task"><Calendar /><span>Call Maya, Thu 14:00</span></div>
        <div className="iv-task"><MessageSquare /><span>Follow up with Northwind</span></div>
        <Bars values={[30, 44, 38, 62, 55, 80]} tone="cyan" />
      </div>
    </div>
  );
}

export function ConnectViz() {
  const pos = [[10, 14], [50, 4], [88, 14], [96, 50], [88, 86], [50, 96], [10, 86], [2, 50]];
  const chosen = systems.slice(0, 8);
  return (
    <div className="iv iv-connect">
      <div className="iv-hubc"><Workflow /><span>Your system</span></div>
      {chosen.map((s, i) => (
        <div key={s.key} className="iv-node" style={{ ...d(i), left: `${pos[i][0]}%`, top: `${pos[i][1]}%` }} title={s.label}>
          <BrandIcon name={s.key} size={24} />
          <span>{s.action}</span>
        </div>
      ))}
    </div>
  );
}

export function CustomViz() {
  const mods = ["Intake form", "Rules engine", "Approvals", "Customer portal", "Reports", "Notifications"];
  return (
    <div className="iv iv-custom">
      {mods.map((m, i) => (
        <div key={m} className="iv-mod" style={d(i)}><i /><span>{m}</span><Line w="70%" /><Line w="45%" /></div>
      ))}
    </div>
  );
}
