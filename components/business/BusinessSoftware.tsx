"use client";
import { ArrowRight, BarChart3, Bell, Building2, Check, ClipboardList, Command, FileText, Landmark, LayoutGrid, Lock, Search, Settings, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";

const NAV = [[LayoutGrid, "Overview"], [Building2, "Customers"], [UsersRound, "Team"], [ClipboardList, "Projects"], [Check, "Tasks"], [FileText, "Documents"], [Landmark, "Finance"], [BarChart3, "Reports"], [Settings, "Settings"]] as const;
const TEAM = [["Maya", 62], ["Leo", 48], ["Ines", 71], ["Sam", 35], ["Jo", 54]] as const;
const PROJECTS = [["Harbor redesign", "Active", "ok"], ["Northwind rollout", "In review", "run"], ["Atlas migration", "Active", "ok"], ["Corvid onboarding", "Planned", "idle"], ["Delta handover", "Active", "ok"], ["Eastgate audit", "Planned", "idle"]] as const;
const CAPTIONS = [
  "A manager opens the dashboard.",
  "Team workload updates.",
  "A customer project is selected.",
  "The detail workspace slides open.",
  "A team member is assigned.",
  "Their permission level changes.",
  "Task status updates.",
  "Reporting reflects the change.",
  "The audit history records the action.",
];
const N = CAPTIONS.length;
type View = "manager" | "team" | "admin";
const VIEWS: [View, string, string][] = [["manager", "MANAGER", "Portfolio, workload, status and reporting"], ["team", "TEAM", "Tasks, customer workspace, documents and activity"], ["admin", "ADMIN", "Roles, permissions, audit and settings"]];
const ROLES = [["Admin", [1, 1, 1, 1]], ["Manager", [1, 1, 1, 0]], ["Staff", [1, 1, 0, 0]], ["Client", [1, 0, 0, 0]]] as const;

/** A dense multi-user business application. The point is management: roles, ownership, records, reporting, audit. */
export function BusinessSoftware() {
  const { reduced } = useMotionPreference();
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-20% 0px -20% 0px", true);
  const near = useInView(box, "900px 0px 900px 0px", true);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [view, setView] = useState<View>("manager");
  const [chk, setChk] = useState<Record<string, boolean>>({ "Prepare scope doc": true });

  const run = () => {
    clearInterval(timer.current);
    let k = 0;
    setStep(0);
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= N - 1) clearInterval(timer.current); }, 1100);
  };
  useEffect(() => { if (reduced) setStep(N - 1); }, [reduced]);
  useEffect(() => {
    if (reduced || !inView) return;
    const t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [inView, reduced]);
  useEffect(() => () => clearInterval(timer.current), []);
  const s = step;

  return (
    <section id="business" className="section bsw" aria-labelledby="bsw-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.business.eyebrow}</p>
          <h2 id="bsw-title" className="h2">{copy.business.title}</h2>
          <p className="body-l">{copy.business.support}</p>
        </Reveal>

        <div className="bsw__views" role="tablist" aria-label="Choose a viewpoint">
          {VIEWS.map(([v, t, d]) => (
            <button key={v} role="tab" aria-selected={view === v} tabIndex={view === v ? 0 : -1} className="bsw__view" data-active={view === v} onClick={() => { setView(v); track("scene_replay", { scene: "business", view: v }); }}
              onKeyDown={(e) => { const i = VIEWS.findIndex((x) => x[0] === view); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = VIEWS[(i + (e.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length][0]; setView(n); } }}>
              <b className="mono">{t}</b><em>{d}</em>
            </button>
          ))}
        </div>
        <div className="bsw__stage" data-view={view} ref={box} data-s={s} role="img" aria-label="A custom business management application: dashboard, team workload, customer workspace, roles and permissions, tasks, reporting and audit history">
          {near && (
          <div className="bsw__scene" aria-hidden>
            {/* background layer: reporting and audit */}
            <div className="bsw__back">
              <div className="bsw__card bsw__rep"><b>Delivery report</b><span><i data-hot={s >= 7} style={{ width: s >= 7 ? "84%" : "72%" }} /></span><em className="mono">{s >= 7 ? "84% on track" : "72% on track"}</em></div>
              <div className="bsw__card bsw__audit"><b className="mono">AUDIT HISTORY</b>
                <ol>
                  <li data-on>Project created, A. Khan</li>
                  <li data-on={s >= 4}>Sam assigned to Northwind</li>
                  <li data-on={s >= 5}>Sam role: Editor to Lead</li>
                  <li data-on={s >= 6}>Task 14 marked done</li>
                  <li data-on={s >= 8} data-new>Report refreshed, logged</li>
                </ol>
              </div>
            </div>

            {/* foreground: manager dashboard */}
            <div className="bsw__app">
              <div className="bsw__bar"><i /><i /><i /><b>Northfield Ops</b><span className="bsw__cmd"><Search />Search anything<kbd><Command />K</kbd></span><Bell className="bsw__bell" /><em>AK</em></div>
              <div className="bsw__grid">
                <nav className="bsw__nav">{NAV.map(([Ic, t]) => <span key={t} data-on={t === "Projects"}><Ic />{t}</span>)}</nav>
                {view === "manager" && (                <div className="bsw__main">
                  <div className="bsw__kpis">
                    <div><em>Active projects</em><b>24</b></div>
                    <div><em>Open tasks</em><b>{s >= 6 ? 137 : 138}</b></div>
                    <div><em>Team utilization</em><b>{s >= 4 ? "74%" : "78%"}</b></div>
                  </div>
                  <div className="bsw__load">
                    <b>Team workload</b>
                    <div>{TEAM.map(([n, v]) => {
                      const val = n === "Sam" && s >= 4 ? 58 : n === "Maya" && s >= 1 ? v - 8 : v;
                      return <span key={n}><i data-hot={n === "Sam" && s >= 4} style={{ height: `${val}%` }} /><u>{n}</u></span>;
                    })}</div>
                  </div>
                  <div className="bsw__tbl">
                    <div className="bsw__r bsw__r--h"><span>Project</span><span>Owner</span><span>Status</span></div>
                    {PROJECTS.map(([p, st, t], i) => (
                      <div key={p} className="bsw__r" data-sel={i === 1 && s >= 2}>
                        <span>{p}</span><span><u>{["MA", "LE", "IN", "SA", "JO", "MA"][i]}</u></span><span><i data-t={t}>{st}</i></span>
                      </div>
                    ))}
                  </div>
                </div>
                )}
                {view === "team" && (
                  <div className="bsw__main bsw__main--alt">
                    <div className="bsw__panel"><b>My tasks</b>
                      {["Prepare scope doc", "Review wireframes", "Send onboarding pack", "Update project plan"].map((t) => (
                        <button type="button" key={t} className="bsw__task" data-done={!!chk[t]} onClick={() => setChk((c) => ({ ...c, [t]: !c[t] }))}><span>{chk[t] ? <Check /> : null}</span>{t}</button>
                      ))}
                    </div>
                    <div className="bsw__panel"><b>Northwind Ltd, documents</b>
                      {["Statement of work.pdf", "Wireframes v3.fig", "Kickoff notes.md"].map((d) => <div key={d} className="bsw__doc"><FileText />{d}</div>)}
                    </div>
                    <div className="bsw__panel"><b>Recent activity</b>
                      <ol className="bsw__feed">{["Leo commented on Wireframes v3", "Maya uploaded Statement of work", "Task 13 moved to review"].map((t) => <li key={t}>{t}</li>)}</ol>
                    </div>
                  </div>
                )}
                {view === "admin" && (
                  <div className="bsw__main bsw__main--alt">
                    <div className="bsw__panel"><b>Roles and permissions</b>
                      <table className="bsw__matrix"><thead><tr><th /><th>View</th><th>Edit</th><th>Approve</th><th>Admin</th></tr></thead><tbody>
                        {ROLES.map(([r, v]) => <tr key={r}><th>{r}</th>{v.map((x, i) => <td key={i} data-on={!!x}>{x ? <Check aria-label="allowed" /> : <span aria-label="no access">-</span>}</td>)}</tr>)}
                      </tbody></table>
                    </div>
                    <div className="bsw__panel"><b>Audit log</b>
                      <ol className="bsw__feed">{["A. Khan changed Sam to Project lead", "System: Report refreshed", "A. Khan invited a client user", "Role Staff: Edit enabled"].map((t) => <li key={t}>{t}</li>)}</ol>
                    </div>
                    <div className="bsw__panel"><b>Settings</b><div className="bsw__chips">{["Single sign-on", "Two-step sign-in", "Data export", "Retention 7 years"].map((t) => <span key={t}><ShieldCheck />{t}</span>)}</div></div>
                  </div>
                )}
              </div>
            </div>

            {/* middle layer: customer workspace drawer */}
            <aside className="bsw__drawer" data-open={s >= 3}>
              <div className="bsw__dh"><span className="bsw__logo">N</span><div><b>Northwind Ltd</b><em>Customer, since 2023</em></div><i data-t="run">In review</i></div>
              <p className="mono bsw__lab">ASSIGNED TEAM</p>
              <div className="bsw__team"><u>MA</u><u>LE</u><u data-new={s >= 4} data-off={s < 4}>SA</u></div>
              <div className="bsw__perm" data-lead={s >= 5}>
                <Lock /><span>Sam Okoye</span><em>{s >= 5 ? "Project lead" : "Editor"}</em><ShieldCheck data-on={s >= 5} />
              </div>
              <p className="mono bsw__lab">TASKS</p>
              <ul className="bsw__tasks">
                <li data-done><Check />Kickoff call</li>
                <li data-done={s >= 6}>{s >= 6 ? <Check /> : <i />}Approve scope</li>
                <li><i />Send onboarding pack</li>
              </ul>
            </aside>
          </div>
          )}
        </div>

        <div className="bsw__foot">
          <p className="bsw__cap body-l" aria-live="polite">{CAPTIONS[s]}</p>
          <div className="bsw__ctas">
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "business" }); goToBuilder(e, "CRM / Internal Tool"); }}>{copy.business.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
