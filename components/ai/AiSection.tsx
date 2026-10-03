"use client";
import { ArrowRight, Bot, Database, Eye, FileText, MessageSquare, Plug, Search, UserCheck, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";

type NodeKey = "vision" | "docs" | "search" | "db" | "api" | "tools" | "approval" | "msg";
const NODES: { key: NodeKey; label: string; icon: LucideIcon }[] = [
  { key: "vision", label: "Vision", icon: Eye },
  { key: "docs", label: "Documents", icon: FileText },
  { key: "search", label: "Search", icon: Search },
  { key: "db", label: "Database", icon: Database },
  { key: "api", label: "APIs", icon: Plug },
  { key: "tools", label: "Tools", icon: Wrench },
  { key: "approval", label: "Human approval", icon: UserCheck },
  { key: "msg", label: "Messaging", icon: MessageSquare },
];
type Step = { node: NodeKey; text: string; state?: "blocked" };
/** A row of the working UI: it appears once `at` steps have played; `flag` shows red until the step after it resolves. */
type UiRow = { k: string; v: string; at: number; flag?: [number, number] };
const SCENARIOS: { id: string; tab: string; hub: string; steps: Step[]; cta: string; ui: { title: string; rows: UiRow[]; result: string } }[] = [
  { id: "support", tab: "Support", hub: "Refund request", cta: "Build an AI Support System", steps: [
    { node: "msg", text: "Request received" }, { node: "search", text: "Policy found" }, { node: "db", text: "Order checked" }, { node: "tools", text: "Refund tool called" },
    { node: "approval", text: "Over the limit: needs a person", state: "blocked" }, { node: "approval", text: "Approved" }, { node: "msg", text: "Customer notified" } ],
    ui: { title: "Ticket 4821: refund request", rows: [{ k: "Customer", v: "Order A-1042, $240", at: 1 }, { k: "Policy", v: "30-day window: eligible", at: 2 }, { k: "Order", v: "Delivered 12 days ago", at: 3 }, { k: "Refund", v: "$240 (agent limit $100)", at: 4, flag: [5, 6] }, { k: "Approval", v: "Approved by a person", at: 6 }], result: "Customer notified" } },
  { id: "documents", tab: "Documents", hub: "Supplier contract", cta: "Build Document Intelligence", steps: [
    { node: "docs", text: "Document uploaded" }, { node: "vision", text: "Pages read" }, { node: "tools", text: "Fields extracted" }, { node: "approval", text: "Missing date: flagged", state: "blocked" },
    { node: "approval", text: "Corrected" }, { node: "db", text: "Validated and stored" } ],
    ui: { title: "Supplier contract.pdf", rows: [{ k: "Supplier", v: "Northfield Logistics", at: 2 }, { k: "Term", v: "24 months", at: 3 }, { k: "Value", v: "$86,400", at: 3 }, { k: "Start date", v: "Missing, then 1 Mar", at: 4, flag: [4, 5] }], result: "Validated and stored" } },
  { id: "media", tab: "Media", hub: "Source video", cta: "Build a Media Pipeline", steps: [
    { node: "docs", text: "Source uploaded" }, { node: "vision", text: "Scenes and frames read" }, { node: "tools", text: "Script drafted" }, { node: "tools", text: "Voice and captions made" },
    { node: "tools", text: "Clip assembled" }, { node: "approval", text: "Reviewed by a person" }, { node: "api", text: "Published" } ],
    ui: { title: "Clip pipeline", rows: [{ k: "Source", v: "Webinar, 42 min", at: 1 }, { k: "Scenes", v: "9 found, 3 selected", at: 2 }, { k: "Script", v: "Draft v1, 45 sec", at: 3 }, { k: "Voice", v: "Captions on", at: 4 }, { k: "Review", v: "Approved", at: 6 }], result: "Published to 3 channels" } },
  { id: "intelligence", tab: "Intelligence", hub: "Opportunity signal", cta: "Build a Data Intelligence System", steps: [
    { node: "api", text: "Live data in" }, { node: "vision", text: "Charts and images read" }, { node: "db", text: "History compared" }, { node: "tools", text: "Score calculated" },
    { node: "approval", text: "Risk check passed" }, { node: "msg", text: "Alert sent" } ],
    ui: { title: "Signal 0.82", rows: [{ k: "Feed", v: "Live, 4 sources", at: 1 }, { k: "Charts", v: "Read and tagged", at: 2 }, { k: "History", v: "90 days compared", at: 3 }, { k: "Score", v: "0.82, above threshold", at: 4 }, { k: "Risk check", v: "Passed", at: 5 }], result: "Alert sent" } },
];
const ANG = (i: number) => (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
const at = (i: number, r: number) => [50 + Math.cos(ANG(i)) * r, 50 + Math.sin(ANG(i)) * r] as const;

export function AiSection() {
  const { reduced } = useMotionPreference();
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-15% 0px -15% 0px");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const played = useRef(false);
  const sc = SCENARIOS[tab];
  const N = sc.steps.length;

  const play = (n: number) => {
    clearInterval(timer.current);
    let k = 0;
    setStep(0);
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= n) clearInterval(timer.current); }, 850);
  };
  useEffect(() => { if (reduced) setStep(N); }, [reduced, N, tab]);
  useEffect(() => {
    if (reduced || !inView || played.current) return;
    played.current = true;
    const t = setTimeout(() => play(N), 400);
    return () => clearTimeout(t);
  }, [inView, reduced, N]);
  useEffect(() => () => clearInterval(timer.current), []);

  const pick = (i: number) => { setTab(i); track("scene_replay", { scene: "ai", scenario: SCENARIOS[i].id }); if (reduced) setStep(SCENARIOS[i].steps.length); else play(SCENARIOS[i].steps.length); };
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (tab + 1) % SCENARIOS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (tab - 1 + SCENARIOS.length) % SCENARIOS.length;
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };

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
  const current = sc.steps[Math.min(step, N - 1)];
  return (
    <section id="ai" className="section section--alt aisec" aria-labelledby="ai-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.ai.eyebrow}</p>
          <h2 id="ai-title" className="h2">{copy.ai.title}</h2>
        </Reveal>
        <div className="aix">
          <div className="aix__orbit" ref={box} aria-hidden>
            <svg viewBox="0 0 100 100" className="aix__lines" preserveAspectRatio="none">
              {NODES.map((n, i) => { const [x, y] = at(i, 38); const st = nodeState(n.key); return <line key={n.key} x1="50" y1="50" x2={x} y2={y} data-st={st} />; })}
            </svg>
            <div className="aix__hub" data-done={step >= N}><Bot /><b>AI system</b><em className="mono">{sc.hub}</em></div>
            {NODES.map((n, i) => {
              const [x, y] = at(i, 38);
              const st = nodeState(n.key);
              return (
                <div key={n.key} className="aix__node" data-st={st} style={{ left: `${x}%`, top: `${y}%` }}>
                  <span><n.icon /></span><b>{n.label}</b>
                </div>
              );
            })}
          </div>
          <div className="aix__side">
            <div className="aix__tabs" role="tablist" aria-label="AI examples" onKeyDown={onKey}>
              {SCENARIOS.map((s, i) => (
                <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`ai-${s.id}`} aria-selected={tab === i} aria-controls="ai-panel" tabIndex={tab === i ? 0 : -1} className="itab" data-active={tab === i} onClick={() => pick(i)}>{s.tab}</button>
              ))}
            </div>
            <div id="ai-panel" role="tabpanel" aria-labelledby={`ai-${sc.id}`}>
              <ol className="aix__steps" aria-label="What the system does">
                {sc.steps.map((s, i) => {
                  const st = step > i ? "done" : step === i ? (s.state === "blocked" ? "blocked" : "active") : "idle";
                  return <li key={sc.id + i} data-st={st}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{s.text}</li>;
                })}
              </ol>
              <div className="aix__ui" aria-hidden>
                <div className="aix__ui-h"><b>{sc.ui.title}</b><span className="mono" data-done={step >= N}>{step >= N ? "DONE" : "WORKING"}</span></div>
                {sc.ui.rows.map((r) => {
                  const shown = step >= r.at;
                  const flagged = !!r.flag && step >= r.flag[0] && step < r.flag[1];
                  return <div key={sc.id + r.k} className="aix__ui-r" data-on={shown} data-flag={flagged}><span>{r.k}</span><em>{r.v}</em></div>;
                })}
                <div className="aix__ui-f" data-on={step >= N}>{sc.ui.result}</div>
              </div>
              <p className="sr-only" aria-live="polite">{current.text}</p>
            </div>
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("ai_cta", { placement: "ai", scenario: sc.id }); presetBuilder("AI System"); }}>{sc.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
