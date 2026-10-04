"use client";
import { Search as SearchIcon, ShieldCheck, LayoutGrid, Settings, ListChecks, Building, AlertTriangle, ArrowRight, Archive, Bell, BarChart3, Building2, CalendarCheck, CalendarDays, Check, CheckCheck, CircleCheck, ClipboardList, CreditCard, Database, Eye, FileSearch, FileText, Film, FolderCheck, GitBranch, GitCompare, Headset, Image as Img, Landmark, Lock, Mail, MessageSquare, Mic, PenLine, Phone, Receipt, ScanText, Send, Sparkles, Stamp, Table2, Type, Upload, UserCheck, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { scenarios } from "@/content/transformations";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";

const icons: Record<string, LucideIcon> = {
  form: ClipboardList, clip: ClipboardList, mail: Mail, sheet: Table2, msg: MessageSquare, crm: UsersRound, users: UsersRound, cal: CalendarDays, "cal-check": CalendarCheck,
  phone: Phone, bell: Bell, file: FileText, stamp: Stamp, chart: BarChart3, archive: Archive, search: FileSearch, db: Database, done: CheckCheck, image: Img, mic: Mic,
  film: Film, type: Type, upload: Upload, bank: Landmark, card: CreditCard, scan: ScanText, compare: GitCompare, folder: FolderCheck, eye: Eye, pen: PenLine, branch: GitBranch,
  lock: Lock, send: Send, spark: Sparkles, "check-user": UserCheck, user: UserRound, headset: Headset, receipt: Receipt,
};
const I = (k: string) => icons[k] ?? Building2;
function Glyph({ k }: { k: string }) { const C = icons[k] ?? Building2; return <C aria-hidden />; }

// Fixed before positions (percent of the stage). The same six tiles are reused by every story.
const POS = [[15, 27, -3], [44, 17, 2], [74, 28, -2], [24, 71, 3], [55, 68, -3], [84, 74, 2]] as const;

const NAV: [LucideIcon, string][] = [[LayoutGrid, "Overview"], [ClipboardList, "Requests"], [Building2, "Vendors"], [Stamp, "Approvals"], [ListChecks, "Tasks"], [BarChart3, "Reports"], [Settings, "Settings"]];
const ROWS = [["#201", "Atlas Supply", "RM", "Approved", "ok"], ["#202", "Brightline Ltd", "JP", "In review", "run"], ["#203", "Corvid Parts", "AK", "Approved", "ok"]] as const;
const AUDIT = ["Logged by A. Khan", "Routed to Finance by rule", "Approved by M. Rossi", "Assigned to J. Park", "Weekly report updated"];

/** One transformation: scattered tools become a real internal application (nav, records, owners, permissions, tasks, approvals, activity, reporting, audit). */
export function Transformation() {
  const { reduced } = useMotionPreference();
  const [state, setState] = useState<"before" | "after">("after");
  const [step, setStep] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const inView = useInView(stage, "-25% 0px -25% 0px");
  const near = useInView(stage, "900px 0px 900px 0px", true);
  const sc = scenarios[0];
  const alts = scenarios.slice(1);
  const N = sc.steps.length;

  useEffect(() => {
    if (reduced) { setState("after"); setStep(N); return; }
    if (!seen.current) { setState("before"); setStep(-1); }
  }, [reduced, N]);
  const autoplay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (reduced || !inView || seen.current) return;
    seen.current = true;
    autoplay.current = setTimeout(() => { setState("after"); track("scene_complete", { scene: "transformation" }); }, 900);
  }, [inView, reduced]);
  useEffect(() => () => clearTimeout(autoplay.current), []);

  useEffect(() => {
    if (state !== "after") { setStep(-1); return; }
    if (reduced) { setStep(N); return; }
    let k = -1;
    setStep(-1);
    let id: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      k = 0; setStep(0);
      id = setInterval(() => { k += 1; setStep(k); if (k >= N) clearInterval(id); }, 760);
    }, 1100);
    return () => { clearTimeout(t0); clearInterval(id); };
  }, [state, reduced, N]);

  const replay = () => { clearTimeout(autoplay.current); seen.current = true; setState("before"); setStep(-1); if (!reduced) autoplay.current = setTimeout(() => setState("after"), 900); else setState("after"); };
  const st204 = step < 0 ? "New" : step === 0 ? "New" : step === 1 ? "Routed" : step === 2 ? "Approved" : "Approved";
  const tone204 = step < 1 ? "idle" : step === 1 ? "run" : "ok";

  return (
    <section id="transform" className="section tf" aria-labelledby="tf-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.transform.eyebrow}</p>
          <h2 id="tf-title" className="h2">{copy.transform.title}</h2>
          <p className="body-l">{copy.transform.support}</p>
        </Reveal>

        <div className="tf__bar">
          <div className="segmented" role="group" aria-label="Show the process before or after it becomes software">
            <button aria-pressed={state === "before"} onClick={() => { setState("before"); seen.current = true; }}>{copy.transform.before}</button>
            <button aria-pressed={state === "after"} onClick={() => { setState("after"); seen.current = true; }}>{copy.transform.after}</button>
          </div>
        </div>

        <div className="mt" ref={stage} data-state={state} data-sc="operations" role="img" aria-label="Vendor approval #204 moving from scattered email, spreadsheets and chat into one custom internal application">
          {near && (
          <>
          <p className="mt-label mt-label--b mono"><AlertTriangle aria-hidden /> BEFORE</p>
          <p className="mt-label mt-label--a mono"><CircleCheck aria-hidden /> AFTER</p>

          <div className="mtapp" aria-hidden>
            <div className="mtapp__bar"><i /><i /><i /><b>Vendor Desk</b><span className="mtapp__search"><SearchIcon />Search requests, vendors</span><em className="mtapp__me">AK</em></div>
            <div className="mtapp__body">
              <nav className="mtapp__nav">{NAV.map(([Ic, t]) => <span key={t} data-on={t === "Requests"}><Ic />{t}</span>)}</nav>
              <div className="mtapp__main">
                <div className="mtapp__h"><b>Vendor approvals</b><span className="mtapp__kpis"><em>New 3</em><em>In review 5</em><em data-ok>Approved 12</em></span></div>
                <div className="mtapp__tbl">
                  <div className="mtapp__r mtapp__r--h"><span>ID</span><span>Vendor</span><span>Owner</span><span>Status</span></div>
                  {ROWS.map(([id, v, o, stt, tn]) => <div key={id} className="mtapp__r"><span>{id}</span><span>{v}</span><span><u>{o}</u></span><span><i data-t={tn}>{stt}</i></span></div>)}
                  <div className="mtapp__r mtapp__r--hi" data-s={step}>
                    <span>#204</span><span>Delta Freight</span>
                    <span>{step >= 3 ? <u data-new>JP</u> : <u data-empty>-</u>}</span>
                    <span><i data-t={tone204}>{st204}</i></span>
                  </div>
                </div>
                <div className="mtapp__rep"><b>Approvals this week</b><span>{[34, 52, 44, 66, 58].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}<i data-hot={step >= N} style={{ height: step >= N ? "92%" : "40%" }} /></span></div>
              </div>
              <aside className="mtapp__det">
                <b>Vendor approval #204</b>
                <div className="mtapp__perm" data-on={step >= 2}><ShieldCheck />Finance approver<em>can approve</em></div>
                <ul className="mtapp__tasks">
                  {["Review contract", "Approve spend", "Notify vendor"].map((t, k) => <li key={t} data-done={step > k + 1}>{step > k + 1 ? <Check /> : <i />}{t}</li>)}
                </ul>
                <p className="mono mtapp__ah">AUDIT HISTORY</p>
                <ol className="mtapp__audit">{AUDIT.map((a, k) => <li key={a} data-on={step >= k}><u />{a}</li>)}</ol>
              </aside>
            </div>
          </div>

          {sc.frags.map((f, i) => {
            const Ic = I(f.icon);
            const [x, y, r] = POS[i];
            return (
              <div key={sc.id + f.name} className="mt-tile" data-n={i + 1} data-st={f.st} style={{ ["--i" as string]: i, ["--bx" as string]: x, ["--by" as string]: y, ["--br" as string]: r }}>
                <span className="mt-tile__ic"><Ic aria-hidden /></span>
                <b>{f.name}</b>
                <i /><i />
                <em className="mt-b mono">{f.st === "bad" ? <X aria-hidden /> : <Bell aria-hidden />}{f.badge}</em>
              </div>
            );
          })}
          <span className="mt-ghost mt-ghost--1" aria-hidden><Glyph k={sc.object.icon} />{sc.object.label}<X /></span>
          <span className="mt-ghost mt-ghost--2" aria-hidden><Glyph k={sc.object.icon} />{sc.object.label}<X /></span>
          </>
          )}
        </div>

        <div className="tf__foot">
          <p className="body-l" aria-live="polite">We turn a manual process into software your team can own: records, owners, permissions, approvals, reporting and an audit trail.</p>
          <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "transformation", scenario: sc.id }); goToBuilder(e, sc.need); }}>{sc.cta}<ArrowRight className="arrow" aria-hidden /></Link>
        </div>

        <ul className="tf__alts" aria-label="Other processes we have turned into software">
          {alts.map((a) => (
            <li key={a.id}>
              <b className="mono">{a.tab.toUpperCase()}</b>
              <span>{a.frags.slice(0, 3).map((f) => f.name).join(", ")}</span>
              <ArrowRight aria-hidden />
              <em>{a.system}</em>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
