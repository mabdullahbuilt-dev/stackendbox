"use client";
import { ArrowRight, BarChart3, Bell, Building2, Check, ClipboardCheck, FolderKanban, Inbox, LayoutGrid, Lock, Search, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useChapterStep } from "@/lib/chapters";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Aperture } from "@/components/site/Aperture";

/** Four operational stories told by ONE application changing state (two beats each). Roles appear inside the story. */
const STORIES = [
  { n: "01", k: "CUSTOMER / INTAKE", t: "A request arrives and gets an owner", nav: 1 },
  { n: "02", k: "PROJECT / OPERATIONS", t: "Work is planned, assigned and balanced", nav: 2 },
  { n: "03", k: "APPROVAL / WORKFLOW", t: "Spend needs Finance before work starts", nav: 3 },
  { n: "04", k: "REPORTING / AUDIT", t: "Progress reports itself, every action is logged", nav: 4 },
] as const;
const NAV = [[LayoutGrid, "Overview"], [Building2, "Customers"], [FolderKanban, "Projects"], [ClipboardCheck, "Approvals"], [BarChart3, "Reports"], [Settings, "Settings"]] as const;
const STEPS = STORIES.length * 2;

function Intake({ b }: { b: number }) {
  const rows = [["Harbor Retail", "Store rollout", "MA", "Active"], ["Atlas Group", "Data migration", "IN", "Active"], ["Corvid Labs", "Onboarding", "JO", "Planned"]];
  return (
    <div className="ops-pane ops-intake">
      <div className="ops-h"><b>Customers</b><span className="ops-chip"><Inbox />1 new request</span></div>
      <div className="ops-tbl">
        <div className="ops-r ops-r--h"><span>Customer</span><span>Request</span><span>Owner</span><span>Status</span></div>
        <div className="ops-r ops-new" data-b={b}><span><u>N</u>Northwind Ltd</span><span>Site migration</span><span>{b >= 1 ? <u className="ops-av ops-av--on">SA</u> : <em className="ops-unassigned">Unassigned</em>}</span><span><i data-t={b >= 1 ? "run" : "new"}>{b >= 1 ? "Assigned" : "New"}</i></span></div>
        {rows.map(([c, r, o, s]) => <div key={c} className="ops-r"><span><u>{c[0]}</u>{c}</span><span>{r}</span><span><u className="ops-av">{o}</u></span><span><i data-t={s === "Active" ? "ok" : "idle"}>{s}</i></span></div>)}
      </div>
      <aside className="ops-side" data-on={b >= 1}><b className="mono">ROUTED BY RULE</b><p>Migration requests go to the delivery team with the most capacity.</p><span><ShieldCheck />Sam Okoye, Delivery</span></aside>
    </div>
  );
}
function Projects({ b }: { b: number }) {
  const load = [["Maya", 82], ["Leo", 64], ["Sam", b >= 1 ? 58 : 34], ["Ines", 71]] as const;
  const tasks = [["Scope and plan", "MA", true], ["Content audit", "SA", b >= 1], ["Redirect map", "SA", false], ["Cutover rehearsal", "LE", false]] as const;
  return (
    <div className="ops-pane ops-proj">
      <div className="ops-h"><b>Northwind site migration</b><span className="ops-chip ops-chip--run">In progress</span></div>
      <div className="ops-proj__grid">
        <div className="ops-card"><b className="mono">TASKS</b>{tasks.map(([t, o, d]) => <div key={t} className="ops-task" data-done={d}><span>{d ? <Check /> : null}</span>{t}<u className="ops-av">{o}</u></div>)}</div>
        <div className="ops-card"><b className="mono">TEAM WORKLOAD</b>{load.map(([n, v]) => <div key={n} className="ops-load"><span>{n}</span><i><s style={{ width: `${v}%` }} data-hot={n === "Sam" && b >= 1} /></i><em>{v}%</em></div>)}</div>
      </div>
    </div>
  );
}
function Approvals({ b }: { b: number }) {
  return (
    <div className="ops-pane ops-appr">
      <div className="ops-h"><b>Approvals</b><span className="ops-chip">{b >= 1 ? "0 waiting" : "1 waiting"}</span></div>
      <div className="ops-req" data-ok={b >= 1}>
        <div className="ops-req__h"><b>Contractor budget, Northwind</b><strong>$18,400</strong></div>
        <p>Over the $10,000 project limit, so the rule sends it to Finance.</p>
        <div className="ops-flow"><span data-st="ok"><Check />Requested by Maya</span><i /><span data-st={b >= 1 ? "ok" : "run"}>{b >= 1 ? <Check /> : <Lock />}Finance: A. Khan</span><i /><span data-st={b >= 1 ? "ok" : "idle"}>{b >= 1 ? <Check /> : null}Work can start</span></div>
      </div>
      <div className="ops-perm"><b className="mono">PERMISSIONS IN THIS STEP</b>{[["Maya, Manager", "request"], ["A. Khan, Finance", "approve"], ["Sam, Delivery", b >= 1 ? "edit project" : "view"]].map(([w, c]) => <div key={w}><span>{w}</span><em>{c}</em></div>)}</div>
    </div>
  );
}
function Reports({ b }: { b: number }) {
  const bars = [44, 52, 61, 58, 70, b >= 1 ? 84 : 72];
  const log = ["Northwind request created", "Owner set to Sam by rule", "Budget approved by A. Khan", "Task: Content audit done", "Delivery report refreshed"];
  return (
    <div className="ops-pane ops-rep">
      <div className="ops-h"><b>Delivery report</b><span className="ops-chip ops-chip--ok">{b >= 1 ? "84% on track" : "72% on track"}</span></div>
      <div className="ops-rep__grid">
        <div className="ops-card"><b className="mono">PROJECTS ON TRACK, LAST 6 WEEKS</b><div className="ops-bars">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} data-hot={i === bars.length - 1} />)}</div></div>
        <div className="ops-card"><b className="mono">AUDIT TRAIL</b><ol className="ops-log">{log.map((l, i) => <li key={l} data-on={i < 4 || b >= 1}>{l}</li>)}</ol></div>
      </div>
    </div>
  );
}
const PANES = [Intake, Projects, Approvals, Reports];

/**
 * One Northfield Ops application that changes state as the visitor scrolls: intake, operations, approval, reporting.
 * Desktop: a short sticky runway (8 beats) keeps the whole chapter in one viewport. Small screens: pass-through range,
 * one pane at a time. Scrolling back steps backward through the same states; every visit replays.
 */
export function BusinessSoftware() {
  const { reduced } = useMotionPreference();
  const raw = useChapterStep("business", STEPS);
  const step = reduced ? STEPS - 1 : raw;
  const story = Math.floor(step / 2), beat = step % 2;
  const S = STORIES[story];
  return (
    <section id="business" className="ops" data-scroll="pin" aria-labelledby="bsw-title">
      <div className="ops__sticky">
        <div className="container ops__in">
          <div className="ops__head">
            <div>
              <p className="eyebrow">{copy.business.eyebrow}</p>
              <h2 id="bsw-title" className="h2">{copy.business.title}</h2>
            </div>
            <p className="body-l">{copy.business.support}</p>
          </div>
          <div className="ops__body">
            <ol className="ops__stories" aria-label="What the application handles">
              {STORIES.map((x, i) => (
                <li key={x.k} data-st={i < story ? "done" : i === story ? "active" : "idle"} aria-current={i === story ? "step" : undefined}>
                  <span className="mono">{x.n}</span><b className="mono">{x.k}</b><em>{x.t}</em>
                </li>
              ))}
              <li className="ops__cta"><Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "business" }); goToBuilder(e, "CRM / Internal Tool"); }}>{copy.business.cta}<ArrowRight className="arrow" aria-hidden /></Link></li>
            </ol>
            <div className="ops__app" data-story={story} role="img" aria-label={`Northfield Ops application, ${S.k.toLowerCase()}: ${S.t}`}>
              <div className="ops__bar" aria-hidden><i /><i /><i /><b>Northfield Ops</b><span className="ops__cmd"><Search />Search anything</span><Bell /><em>AK</em></div>
              <div className="ops__grid" aria-hidden>
                <nav className="ops__nav">{NAV.map(([Ic, t], i) => <span key={t} data-on={i === S.nav}><Ic />{t}</span>)}</nav>
                <div className="ops__main">
                  {PANES.map((P, i) => <div key={i} className="ops__state" data-on={i === story} data-dir={i < story ? "past" : i > story ? "next" : "now"}><P b={i === story ? beat : i < story ? 1 : 0} /></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Aperture kind="record" />
    </section>
  );
}
