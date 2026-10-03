"use client";
import { AlertTriangle, ArrowRight, Archive, Bell, BarChart3, Building2, CalendarCheck, CalendarDays, Check, CheckCheck, CircleCheck, ClipboardList, CreditCard, Database, Eye, FileSearch, FileText, Film, FolderCheck, GitBranch, GitCompare, Headset, Image as Img, Landmark, Lock, Mail, MessageSquare, Mic, PenLine, Phone, Receipt, ScanText, Send, Sparkles, Stamp, Table2, Type, Upload, UserCheck, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { scenarios } from "@/content/transformations";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
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

export function Transformation() {
  const { reduced } = useMotionPreference();
  const [tab, setTab] = useState(0);
  const [state, setState] = useState<"before" | "after">("after");
  const [step, setStep] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const inView = useInView(stage, "-25% 0px -25% 0px");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sc = scenarios[tab];
  const N = sc.steps.length;

  // Reduced motion: final state, fully resolved. Otherwise start from the fragmented Before state.
  useEffect(() => {
    if (reduced) { setState("after"); setStep(N); return; }
    if (!seen.current) { setState("before"); setStep(-1); }
  }, [reduced, N]);
  const autoplay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (reduced || !inView || seen.current) return;
    seen.current = true;
    // Not cleared by dependency changes: the first play must always complete.
    autoplay.current = setTimeout(() => { setState("after"); track("scene_complete", { scene: "transformation" }); }, 700);
  }, [inView, reduced]);
  useEffect(() => () => clearTimeout(autoplay.current), []);

  // After: fragments dock, the object enters the platform, then each stage turns orange and then green.
  useEffect(() => {
    if (state !== "after") { setStep(-1); return; }
    if (reduced) { setStep(N); return; }
    let k = -1;
    setStep(-1);
    let id: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      k = 0; setStep(0);
      id = setInterval(() => { k += 1; setStep(k); if (k >= N) clearInterval(id); }, 720);
    }, 1000);
    return () => { clearTimeout(t0); clearInterval(id); };
  }, [state, tab, reduced, N]);

  // The object travels from its scattered spot into the platform (measured once per change, transform only).
  useEffect(() => {
    const st = stage.current, tk = token.current, target = state === "after" ? slot.current : origin.current;
    if (!st || !tk || !target) return;
    const a = st.getBoundingClientRect(), b = target.getBoundingClientRect();
    tk.style.translate = `${b.left - a.left + b.width / 2 - tk.offsetWidth / 2}px ${b.top - a.top + b.height / 2 - tk.offsetHeight / 2}px`;
  }, [state, tab]);

  const pick = (i: number) => {
    setTab(i);
    track("transformation_selected", { scenario: scenarios[i].id });
    if (!reduced) { clearTimeout(autoplay.current); seen.current = true; setState("before"); setStep(-1); autoplay.current = setTimeout(() => setState("after"), 900); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = scenarios.length;
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (tab + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (tab - 1 + n) % n;
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };

  return (
    <section id="transform" className="section tf" aria-labelledby="tf-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.transform.eyebrow}</p>
          <h2 id="tf-title" className="h2">{copy.transform.title}</h2>
        </Reveal>

        <div className="tf__bar">
          <div className="tf__tabs" role="tablist" aria-label="Processes" onKeyDown={onKey}>
            {scenarios.map((s, i) => (
              <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`tf-${s.id}`} aria-selected={tab === i} aria-controls="tf-panel" tabIndex={tab === i ? 0 : -1} className="itab" data-active={tab === i} onClick={() => pick(i)}>{s.tab}</button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Show the process before or after automation">
            <button aria-pressed={state === "before"} onClick={() => setState("before")}>{copy.transform.before}</button>
            <button aria-pressed={state === "after"} onClick={() => { setState("after"); seen.current = true; }}>{copy.transform.after}</button>
          </div>
        </div>

        <div id="tf-panel" role="tabpanel" aria-labelledby={`tf-${sc.id}`}>
          <div className="mt" ref={stage} data-state={state} data-sc={sc.id}>
            <p className="mt-label mt-label--b mono"><AlertTriangle aria-hidden /> BEFORE</p>
            <p className="mt-label mt-label--a mono"><CircleCheck aria-hidden /> AFTER</p>

            <div className="mt-win" aria-hidden>
              <div className="mt-win__bar"><i /><i /><i /><b>{sc.system}</b></div>
              <div className="mt-slot" ref={slot} />
              <ol className="mt-rows">
                {sc.steps.map((s, i) => {
                  const Ic = I(s.icon);
                  const st = step > i ? "done" : step === i ? "active" : "idle";
                  return (
                    <li key={sc.id + s.label} data-st={st}>
                      <span className="mt-rows__ic"><Ic /></span><b>{s.label}</b>
                      {st === "done" ? <Check className="mt-rows__ok" /> : st === "active" ? <i className="mt-rows__dot" /> : null}
                    </li>
                  );
                })}
              </ol>
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
                  <em className="mt-a mono"><Check aria-hidden />CONNECTED</em>
                </div>
              );
            })}

            <div className="mt-origin" ref={origin} aria-hidden />
            <span className="mt-ghost mt-ghost--1" aria-hidden><Glyph k={sc.object.icon} />{sc.object.label}<X /></span>
            <span className="mt-ghost mt-ghost--2" aria-hidden><Glyph k={sc.object.icon} />{sc.object.label}<X /></span>
            <div className="mt-token" ref={token} data-done={step >= N} aria-hidden><Glyph k={sc.object.icon} /><b>{sc.object.label}</b>{step >= N && <Check />}</div>
          </div>
          <div className="tf__foot">
            <p className="body-l" aria-live="polite">{sc.line}</p>
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "transformation", scenario: sc.id }); presetBuilder(sc.need); }}>{sc.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
