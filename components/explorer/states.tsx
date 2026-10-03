"use client";
import { m } from "motion/react";
import { Bars, Avatar, Bubble, Line, Pill, Tile } from "@/components/ui/mock";
import { Calendar, CreditCard, Database, Gauge, KeyRound, LayoutGrid, Lock, MessageSquare, Plug, ShieldCheck, Sparkles, Users, Workflow, Webhook, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { Tone } from "@/components/ui/StatusChip";

export type StateId = "product" | "ai" | "automation" | "crm" | "integrations" | "custom";
export type Chip = { tone: Tone; text: string; verify?: boolean; dashed?: boolean };
export type SlotContent = { node: ReactNode; caption: string } | null;
export type StateSlots = {
  s1: SlotContent; s2: SlotContent; s3: SlotContent; s4: SlotContent; s7: SlotContent;
  s5: Chip; s6: Chip;
};
type Ctx = { step: number; reduced: boolean; focusInput?: boolean };

const MiniCard = ({ icon, title, sub, tone }: { icon: ReactNode; title: string; sub: string; tone?: string }) => (
  <div className="mk-mini">
    <span className="mk-mini__ic" data-tone={tone}>{icon}</span>
    <span className="mk-mini__t"><b>{title}</b><em>{sub}</em></span>
  </div>
);

function Kanban({ cols, cards, lead, leadCol, reduced }: { cols: string[]; cards: string[][]; lead: string; leadCol: number; reduced: boolean }) {
  return (
    <div className="mk-board">
      {cols.map((c, i) => (
        <div key={c} className="mk-col">
          <span className="mono mono--muted">{c}</span>
          {cards[i]?.map((t) => <div key={t} className="mk-card">{t}</div>)}
        </div>
      ))}
      <m.div
        className="mk-card mk-card--lead"
        initial={false}
        animate={{ x: `${leadCol * 100}%` }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 28 }}
      >
        {lead}
      </m.div>
    </div>
  );
}

export function getSlots(id: StateId, { step, reduced, focusInput }: Ctx): StateSlots {
  switch (id) {
    case "product":
      return {
        s1: { caption: "APP · DASHBOARD · SAMPLE DATA", node: (
          <div className="mk-app">
            <aside><LayoutGrid /><Users /><CreditCard /><Gauge /></aside>
            <div className="mk-app__main">
              <div className="mk-row"><b>Overview</b><Pill tone="cyan">SAMPLE</Pill></div>
              <div className="mk-tiles"><Tile label="USERS" value="1,284" /><Tile label="ACTIVE" value="312" tone="cyan" /><Tile label="PLANS" value="3" /></div>
              <div className="mk-table">
                {[["Northwind team", "Pro"], ["Acme workspace", "Team"], ["Studio 12", "Starter"]].map(([a, b]) => (
                  <div key={a} className="mk-trow"><Avatar>{a[0]}</Avatar><span>{a}</span><Pill>{b}</Pill></div>
                ))}
              </div>
            </div>
          </div>) },
        s2: { caption: "AUTH · SSO · MFA", node: <MiniCard icon={<KeyRound />} title="Sign in" sub="SSO · MFA ✓" /> },
        s3: { caption: "BILLING · SUBSCRIPTION", node: <MiniCard icon={<CreditCard />} title="Subscription" sub="active" tone="green" /> },
        s4: { caption: "ADMIN · USERS · ROLES", node: <MiniCard icon={<ShieldCheck />} title="Admin" sub="Users · Roles" /> },
        s5: { tone: "green", text: "DEPLOYED", verify: true }, s6: { tone: "cyan", text: "DB · 12 TABLES" },
        s7: { caption: "CUSTOMER · MOBILE", node: (
          <div className="mk-phone"><Line w="40%" /><div className="mk-phone__hero" /><Line w="80%" /><Line w="60%" /><div className="mk-phone__btn" /></div>) },
      };
    case "ai":
      return {
        s1: { caption: "AGENT CONSOLE · TOOL CALLS", node: (
          <div className="mk-console">
            <Bubble me>Summarise this contract and flag risks.</Bubble>
            <div className="mk-tools">
              <div className="mk-tool"><Zap /><span className="mono">search_documents</span><Pill tone="green">DONE</Pill></div>
              <div className="mk-tool"><Zap /><span className="mono">extract_clauses</span><Pill tone="green">DONE</Pill></div>
              <div className="mk-tool" data-pending={step < 1}><Zap /><span className="mono">draft_summary</span>{step < 1 ? <Pill tone="amber">RUNNING</Pill> : <Pill tone="green">DONE</Pill>}</div>
            </div>
            <Bubble>{step < 1 ? <span className="mk-typing"><i /><i /><i /></span> : "3 clauses need review. Summary ready for approval."}</Bubble>
          </div>) },
        s2: { caption: "INPUT · USER REQUEST", node: <MiniCard icon={<MessageSquare />} title="Input" sub="“Summarise this contract…”" /> },
        s3: { caption: "RETRIEVAL · 3 SOURCES", node: <MiniCard icon={<Database />} title="Retrieved context" sub="3 sources" tone="cyan" /> },
        s4: { caption: "HUMAN APPROVAL", node: (
          <div className="mk-mini mk-mini--col"><b>Human approval</b><div className="mk-row"><span className="mk-btn mk-btn--ok">Approve</span><span className="mk-btn">Edit</span></div></div>) },
        s5: { tone: "green", text: "TOOL CALL ✓", verify: true }, s6: { tone: "amber", text: "HUMAN IN THE LOOP" },
        s7: { caption: "ANSWER · MOBILE", node: <div className="mk-phone"><Bubble me>Summary?</Bubble><Bubble>3 clauses flagged.</Bubble><Line w="70%" /></div> },
      };
    case "automation": {
      const col = Math.min(3, step);
      return {
        s1: { caption: "WORKFLOW RUN · LEAD", node: (
          <Kanban cols={["TRIGGER", "CLASSIFY", "MESSAGE", "BOOK"]} cards={[["Web form"], ["Intent"], ["Template"], ["Slot"]]} lead="New lead" leadCol={reduced ? 3 : col} reduced={reduced} />) },
        s2: { caption: "INCOMING LEAD · WEB FORM", node: <MiniCard icon={<Users />} title="New lead" sub="web form" /> },
        s3: { caption: "AI SCORE · SAMPLE", node: <MiniCard icon={<Sparkles />} title="Qualified" sub="82/100 · sample" tone="cyan" /> },
        s4: { caption: "MESSAGE · AUTOMATED", node: <MiniCard icon={<MessageSquare />} title="WhatsApp sent" sub="follow-up message" tone="green" /> },
        s5: { tone: "blue", text: "ROUTED" }, s6: { tone: "amber", text: "FOLLOW-UP SCHEDULED" },
        s7: { caption: "BOOKING · CONFIRMATION", node: <div className="mk-phone"><Calendar className="mk-phone__ic" /><b>Meeting booked</b><Line w="70%" /><Pill tone="green">CONFIRMED</Pill></div> },
      };
    }
    case "crm": {
      const moved = reduced || step >= 2;
      return {
        s1: { caption: "PIPELINE · SAMPLE DATA", node: (
          <Kanban cols={["NEW", "QUALIFIED", "PROPOSAL", "WON"]} cards={[["Lead A", "Lead B"], ["Lead C"], ["Lead D"], moved ? ["Lead F"] : []]} lead="Lead E" leadCol={moved ? 2 : 1} reduced={reduced} />) },
        s2: { caption: "CONTACT · OWNER", node: <MiniCard icon={<Users />} title="Maya Chen" sub="Inbound · owner: Sam" /> },
        s3: { caption: "TASKS · TODAY", node: <MiniCard icon={<Calendar />} title="Call back" sub="today · 14:30" tone="cyan" /> },
        s4: { caption: "ACTIVITY TIMELINE", node: <div className="mk-mini mk-mini--col"><b>Activity</b><Line w="90%" /><Line w="70%" /><Line w="80%" /></div> },
        s5: { tone: "green", text: "SYNCED", verify: true }, s6: { tone: "green", text: "AUTOMATION ON" },
        s7: { caption: "PIPELINE · MOBILE", node: <div className="mk-phone"><Pill tone="blue">QUALIFIED</Pill><div className="mk-card">Lead C</div><div className="mk-card">Lead E</div><div className="mk-card">Lead D</div></div> },
      };
    }
    case "integrations": {
      const docked = reduced ? 6 : Math.min(6, step * 2);
      const tiles = [CreditCard, Users, Calendar, MessageSquare, Database, Gauge];
      return {
        s1: { caption: "SYNC HUB · 6 CONNECTORS", node: (
          <div className="mk-hub">
            <div className="mk-row"><b>ONE SYSTEM</b><Pill tone={docked >= 6 ? "green" : "amber"}>{docked >= 6 ? "ALL CONNECTED" : "CONNECTING"}</Pill></div>
            <div className="mk-slots">
              {tiles.map((T, i) => (
                <div key={i} className="mk-slot" data-on={i < docked}>
                  <m.span initial={false} animate={{ opacity: i < docked ? 1 : 0, scale: i < docked ? 1 : 0.6, y: i < docked ? 0 : 10 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}><T /></m.span>
                </div>
              ))}
            </div>
          </div>) },
        s2: { caption: "WEBHOOK · RECEIVED", node: <MiniCard icon={<Webhook />} title="Webhook received" sub="POST /events" /> },
        s3: { caption: "PAYMENT · CONFIRMED", node: <MiniCard icon={<CreditCard />} title="Payment confirmed" sub="evt_1042" tone="green" /> },
        s4: { caption: "CRM · UPDATED", node: <MiniCard icon={<Users />} title="CRM updated" sub="deal moved" tone="green" /> },
        s5: { tone: "green", text: "CONNECTED", verify: true }, s6: { tone: "cyan", text: "DATA SYNCED" },
        s7: { caption: "DASHBOARD · GLANCE", node: <div className="mk-phone"><b className="tnum">1,204</b><span className="mono mono--muted">EVENTS</span><Bars values={[30, 55, 40, 70, 60, 85]} tone="cyan" /></div> },
      };
    }
    case "custom": {
      const filled = reduced || step >= 1;
      return {
        s1: { caption: "MODULAR SYSTEM · EMPTY", node: (
          <div className="mk-custom">
            <div className="mk-input" data-focus={focusInput}><span className="mono mono--muted">DESCRIBE THE PROBLEM</span><span className="mk-caret" /></div>
            <div className="mk-dashgrid">
              <div className="slotbox mk-dash" data-filled={filled}>{filled && <m.div initial={reduced ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mk-generic"><Workflow /><Line w="60%" /></m.div>}</div>
              <div className="slotbox mk-dash" /><div className="slotbox mk-dash" /><div className="slotbox mk-dash" />
            </div>
          </div>) },
        s2: { caption: "INPUT · YOUR PROBLEM", node: <div className="mk-mini mk-mini--col"><span className="mono mono--muted">PROBLEM</span><div className="mk-input" data-focus={focusInput}><Line w="80%" /></div></div> },
        s3: { caption: "OPEN SLOT", node: <div className="slotbox mk-empty"><Plug /></div> },
        s4: { caption: "OPEN SLOT", node: <div className="slotbox mk-empty"><Lock /></div> },
        s5: { tone: "muted", text: "READY" }, s6: { tone: "blue", text: "NEW MODULE +", dashed: true },
        s7: null,
      };
    }
  }
}
