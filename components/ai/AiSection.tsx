"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { DocumentApp, IntelligenceApp, MediaApp, SupportApp } from "./AiApps";
import { AiOrbit, type NodeKey } from "./AiOrbit";

const APPS: Record<string, (p: { step: number }) => React.JSX.Element> = { support: SupportApp, documents: DocumentApp, media: MediaApp, intelligence: IntelligenceApp };

/** Each scenario is led by the capability that docks into the core. */
const LEAD: NodeKey[] = ["search", "docs", "vision", "db"];
type Step = { node: NodeKey; text: string; state?: "blocked" };
/** A row of the working UI: it appears once `at` steps have played; `flag` shows red until the step after it resolves. */
type UiRow = { k: string; v: string; at: number; flag?: [number, number] };
const SCENARIOS: { id: string; tab: string; hub: string; steps: Step[]; cta: string; ui: { title: string; rows: UiRow[]; result: string } }[] = [
  { id: "support", tab: "Support", hub: "Refund request", cta: "Build an AI Support System", steps: [
    { node: "docs", text: "Request received" }, { node: "search", text: "Policy found" }, { node: "db", text: "Order checked" }, { node: "tools", text: "Refund tool called" },
    { node: "approval", text: "Over the limit: needs a person", state: "blocked" }, { node: "approval", text: "Approved" }, { node: "tools", text: "Customer notified" } ],
    ui: { title: "Ticket 4821: refund request", rows: [{ k: "Customer", v: "Order A-1042, $240", at: 1 }, { k: "Policy", v: "30-day window: eligible", at: 2 }, { k: "Order", v: "Delivered 12 days ago", at: 3 }, { k: "Refund", v: "$240 (agent limit $100)", at: 4, flag: [5, 6] }, { k: "Approval", v: "Approved by a person", at: 6 }], result: "Customer notified" } },
  { id: "documents", tab: "Documents", hub: "Supplier contract", cta: "Build Document Intelligence", steps: [
    { node: "docs", text: "Document uploaded" }, { node: "vision", text: "Pages read" }, { node: "tools", text: "Fields extracted" }, { node: "approval", text: "Missing date: flagged", state: "blocked" },
    { node: "approval", text: "Corrected" }, { node: "db", text: "Validated and stored" } ],
    ui: { title: "Supplier contract.pdf", rows: [{ k: "Supplier", v: "Northfield Logistics", at: 2 }, { k: "Term", v: "24 months", at: 3 }, { k: "Value", v: "$86,400", at: 3 }, { k: "Start date", v: "Missing, then 1 Mar", at: 4, flag: [4, 5] }], result: "Validated and stored" } },
  { id: "media", tab: "Media", hub: "Source video", cta: "Build a Media Pipeline", steps: [
    { node: "docs", text: "Source uploaded" }, { node: "vision", text: "Scenes and frames read" }, { node: "tools", text: "Script drafted" }, { node: "tools", text: "Voice and captions made" },
    { node: "tools", text: "Clip assembled" }, { node: "approval", text: "Reviewed by a person" }, { node: "tools", text: "Published" } ],
    ui: { title: "Clip pipeline", rows: [{ k: "Source", v: "Webinar, 42 min", at: 1 }, { k: "Scenes", v: "9 found, 3 selected", at: 2 }, { k: "Script", v: "Draft v1, 45 sec", at: 3 }, { k: "Voice", v: "Captions on", at: 4 }, { k: "Review", v: "Approved", at: 6 }], result: "Published to 3 channels" } },
  { id: "intelligence", tab: "Intelligence", hub: "Opportunity signal", cta: "Build a Data Intelligence System", steps: [
    { node: "db", text: "Live data in" }, { node: "vision", text: "Charts and images read" }, { node: "db", text: "History compared" }, { node: "tools", text: "Score calculated" },
    { node: "approval", text: "Risk check passed" }, { node: "tools", text: "Alert sent" } ],
    ui: { title: "Signal 0.82", rows: [{ k: "Feed", v: "Live, 4 sources", at: 1 }, { k: "Charts", v: "Read and tagged", at: 2 }, { k: "History", v: "90 days compared", at: 3 }, { k: "Score", v: "0.82, above threshold", at: 4 }, { k: "Risk check", v: "Passed", at: 5 }], result: "Alert sent" } },
];
export function AiSection() {
  const { reduced } = useMotionPreference();
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-15% 0px -15% 0px");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sc = SCENARIOS[tab];
  const N = sc.steps.length;
  const [docked, setDocked] = useState<NodeKey | null>(null);
  const dockedRef = useRef<NodeKey | null>(null);
  dockedRef.current = docked;

  const play = (n: number) => {
    clearInterval(timer.current);
    let k = 0;
    setStep(0);
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= n) clearInterval(timer.current); }, 850);
  };
  useEffect(() => { if (reduced) setStep(N); }, [reduced, N, tab]);
  // Every visit replays: entering starts the first scenario; leaving stops everything and resets.
  const lastUser = useRef(0);
  useEffect(() => {
    if (reduced) return;
    if (!inView) { clearInterval(timer.current); setDocked(null); setStep(0); setTab(0); return; }
    const t = setTimeout(() => dock(0, LEAD[0], true), 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced]);
  useEffect(() => () => clearInterval(timer.current), []);

  // when the run finishes the capability returns to its orbit and the scene settles
  useEffect(() => {
    if (docked && step >= N) {
      const t = setTimeout(() => setDocked(null), reduced ? 0 : 1300);
      return () => clearTimeout(t);
    }
  }, [docked, step, N, reduced]);

  const dock = (i: number, key: NodeKey, auto = false) => { if (!auto) lastUser.current = Date.now(); setTab(i); setDocked(key); if (!auto) track("scene_replay", { scene: "ai", scenario: SCENARIOS[i].id, node: key }); if (reduced) setStep(SCENARIOS[i].steps.length); else play(SCENARIOS[i].steps.length); };
  const pick = (i: number) => dock(i, LEAD[i]);
  const pickByNode = (key: NodeKey) => { const i = LEAD.indexOf(key); dock(i >= 0 ? i : SCENARIOS.findIndex((s) => s.steps.some((x) => x.node === key)), key); };
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (tab + 1) % SCENARIOS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (tab - 1 + SCENARIOS.length) % SCENARIOS.length;
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };

  // Gentle auto-cycle while the chapter stays in view: the next scenario docks a few seconds after one finishes,
  // unless the visitor chose a scenario in the last 12 seconds.
  useEffect(() => {
    if (reduced || !inView || docked || step < N) return;
    const t = setTimeout(() => { if (Date.now() - lastUser.current < 12000) return; const n = (tab + 1) % SCENARIOS.length; dock(n, LEAD[n], true); }, 4200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked, step, N, inView, reduced, tab]);

  // state of each node derived from the steps played so far
  const nodeState = (k: NodeKey): "idle" | "active" | "done" | "blocked" => {
    let st: "idle" | "active" | "done" | "blocked" = "idle";
    sc.steps.forEach((s, i) => {
      if (s.node !== k) return;
      if (step > i) st = "done";
      else if (step === i) st = s.state === "blocked" ? "blocked" : "active";
    });
    return st;
  };
  return (
    <section id="ai" className="section section--alt aisec" aria-labelledby="ai-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.ai.eyebrow}</p>
          <h2 id="ai-title" className="h2">{copy.ai.title}</h2>
        </Reveal>
        <div className="aix" ref={box}>
          <AiOrbit docked={docked} stateOf={nodeState} hub={sc.hub} busy={!!docked && step < N} done={step >= N} live={inView} reduced={reduced} onPick={pickByNode} />
          <div className="aix__side">
            <div className="aix__tabs" role="tablist" aria-label="AI examples" onKeyDown={onKey}>
              {SCENARIOS.map((s, i) => (
                <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`ai-${s.id}`} aria-selected={tab === i} aria-controls="ai-panel" tabIndex={tab === i ? 0 : -1} className="itab" data-active={tab === i} onClick={() => pick(i)}>{s.tab}</button>
              ))}
            </div>
            <div id="ai-panel" role="tabpanel" aria-labelledby={`ai-${sc.id}`}>
              <div className="aix__ui" aria-hidden>
                <div className="aix__ui-h"><b>{sc.ui.title}</b><span className="mono" data-done={step >= N}>{step >= N ? "DONE" : "WORKING"}</span></div>
                <div className="aix__trail" aria-hidden><i style={{ width: `${(Math.min(step, N) / N) * 100}%` }} /><em className="mono">{String(Math.min(step + 1, N)).padStart(2, "0")} / {String(N).padStart(2, "0")} · {sc.steps[Math.min(step, N - 1)].text}</em></div>
                {(() => { const App = APPS[sc.id]; return <App step={step} />; })()}
                <div className="aix__ui-f" data-on={step >= N}>{sc.ui.result}</div>
              </div>
              <p className="sr-only">{sc.steps.map((x) => x.text).join(", ")}.</p>
            </div>
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("ai_cta", { placement: "ai", scenario: sc.id }); goToBuilder(e, "AI System"); }}>{sc.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
