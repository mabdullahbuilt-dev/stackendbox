import { Check, Cpu, CreditCard, Database, KeyRound, Lock, MessageSquare, Plug, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, Bars, Line, Pill, Tile } from "@/components/ui/mock";

export type Plane = { id: string; title: string; sub: string; art: ReactNode };

const Ep = ({ m, p, c }: { m: string; p: string; c: string }) => (
  <div className="pl-ep"><span className="mono pl-m" data-m={m}>{m}</span><span className="mono">{p}</span><span className="mono pl-c">{c}</span></div>
);

export const planes: Record<string, Plane> = {
  interface: { id: "interface", title: "INTERFACE", sub: "Responsive UI, states, accessibility", art: (
    <div className="mk-app pl-app"><aside><span className="mono">N</span><Lock /><Lock /></aside><div className="mk-app__main"><div className="mk-tiles"><Tile label="MEMBERS" value="8" /><Tile label="PROJECTS" value="24" tone="cyan" /><Tile label="SEATS" value="8/10" /></div><Bars values={[30, 44, 36, 58, 50, 72, 64, 86]} /></div></div>) },
  logic: { id: "logic", title: "PRODUCT LOGIC", sub: "Rules, workflows and validation", art: (
    <div className="pl-blocks">{[["VALIDATE", "input · schema"], ["WORKFLOW", "booking · approval"], ["RULES", "pricing · limits"]].map(([a, b]) => <div key={a} className="pl-block"><Pill tone="blue">{a}</Pill><Line w="55%" /><span className="mono mono--muted">{b}</span></div>)}</div>) },
  auth: { id: "auth", title: "AUTHENTICATION", sub: "Sessions, roles, permissions", art: (
    <div className="pl-auth"><div className="pl-locks">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} data-on={i < 4}>{i < 4 ? <KeyRound /> : <Lock />}</span>)}</div><div className="pl-roles"><Pill tone="blue">OWNER</Pill><Pill>EDITOR</Pill><Pill>VIEWER</Pill><Pill tone="green">SSO</Pill></div></div>) },
  api: { id: "api", title: "API", sub: "Typed endpoints, webhooks, rate limits", art: (
    <div className="pl-eps"><Ep m="GET" p="/bookings" c="200" /><Ep m="POST" p="/payments" c="201" /><Ep m="PUT" p="/users/:id" c="200" /><Ep m="POST" p="/webhooks" c="202" /></div>) },
  database: { id: "database", title: "DATABASE", sub: "Schemas, migrations, backups", art: (
    <div className="pl-table">{["users", "plans", "bookings", "invoices"].map((t, c) => <div key={t}><b className="mono">{t}</b>{[0, 1, 2, 3].map((r) => <i key={r} style={{ width: `${55 + ((r * 13 + c * 17) % 40)}%` }} />)}</div>)}</div>) },
  ai: { id: "ai", title: "AI", sub: "Models, retrieval, guardrails", art: (
    <div className="pl-ai"><div className="pl-ctx">{["SYSTEM", "CONTEXT", "TOOLS"].map((c) => <div key={c}><span className="mono">{c}</span><Line w="60%" /></div>)}</div><div className="pl-guard"><span className="mono">GUARDRAIL</span><i /></div><div className="mk-tool"><Cpu /><span className="mono">tool_call</span><Pill tone="green">OK</Pill></div></div>) },
  integrations: { id: "integrations", title: "INTEGRATIONS", sub: "Payments, CRM, messaging, sync", art: (
    <div className="pl-sockets">{[CreditCard, Users, MessageSquare, Database, Plug].map((I, i) => <span key={i}><I /></span>)}</div>) },
  testing: { id: "testing", title: "TESTING", sub: "Unit, integration, end-to-end", art: (
    <div className="pl-tests">{["Unit · 128", "Integration · 42", "End-to-end · 18", "Accessibility · 24"].map((t) => <div key={t}><Check /><span className="mono">{t}</span></div>)}</div>) },
  deployment: { id: "deployment", title: "DEPLOYMENT", sub: "CI/CD, monitoring, rollback", art: (
    <div className="pl-deploy"><div>{["BUILD", "TEST", "DEPLOY"].map((s) => <span key={s} className="mono"><Check />{s}</span>)}</div><div className="mk-row"><Pill tone="green">LIVE</Pill><span className="mono mono--muted">monitoring · rollback ready</span></div><Avatar>●</Avatar></div>) },
  logicApi: { id: "logicApi", title: "LOGIC & API", sub: "Rules, workflows, typed endpoints", art: (
    <div className="pl-eps"><Ep m="GET" p="/bookings" c="200" /><Ep m="POST" p="/payments" c="201" /><div className="pl-block"><Pill tone="blue">RULES</Pill><Line w="60%" /></div></div>) },
  logicAi: { id: "logicAi", title: "LOGIC & AI", sub: "Rules, workflows, models, guardrails", art: (
    <div className="pl-ai"><div className="pl-ctx">{["RULES", "CONTEXT", "TOOLS"].map((c) => <div key={c}><span className="mono">{c}</span><Line w="60%" /></div>)}</div><div className="pl-guard"><span className="mono">GUARDRAIL</span><i /></div></div>) },
  aiIntegrations: { id: "aiIntegrations", title: "AI & INTEGRATIONS", sub: "Models, retrieval, payments, CRM, sync", art: (
    <div className="pl-ai"><div className="pl-guard"><span className="mono">GUARDRAIL</span><i /></div><div className="pl-sockets">{[CreditCard, Users, MessageSquare, Database, Plug].map((I, i) => <span key={i}><I /></span>)}</div></div>) },
  testDeploy: { id: "testDeploy", title: "TESTING & DEPLOYMENT", sub: "Tests, CI/CD, monitoring, rollback", art: (
    <div className="pl-tests">{["Unit · 128", "End-to-end · 18"].map((t) => <div key={t}><Check /><span className="mono">{t}</span></div>)}<div className="pl-deploy"><div className="mk-row"><Pill tone="green">LIVE</Pill><span className="mono mono--muted">rollback ready</span></div></div></div>) },
  apiOnly: { id: "apiOnly", title: "API", sub: "Typed endpoints, webhooks, rate limits", art: (
    <div className="pl-eps"><Ep m="GET" p="/bookings" c="200" /><Ep m="POST" p="/payments" c="201" /><Ep m="POST" p="/webhooks" c="202" /></div>) },
};

export const SETS = {
  p9: ["interface", "logic", "auth", "api", "database", "ai", "integrations", "testing", "deployment"],
  p7: ["interface", "logicAi", "auth", "apiOnly", "database", "integrations", "testDeploy"],
  p5: ["interface", "logicApi", "database", "aiIntegrations", "testDeploy"],
} as const;
