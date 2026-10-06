"use client";
import { Blocks, Check, ClipboardList, Database, Gauge, LayoutTemplate, PackageCheck, PenTool, Plug, Rocket, ShieldCheck, Smartphone, Target, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { steps } from "@/content/process";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { Aperture } from "@/components/site/Aperture";

const OUT: [string, number][] = [["Requirements", 0], ["User flow", 1], ["Wireframes", 1], ["Interface", 2], ["API", 2], ["Data model", 2], ["Test suite", 3], ["Release", 4], ["Monitoring", 4]];
const icons: LucideIcon[] = [Target, PenTool, Blocks, ShieldCheck, PackageCheck];

/**
 * One artifact evolves through five stages: brief, flow and wireframe, working product,
 * tests (with one caught and fixed issue), then a deployment that goes live.
 */
export function Process() {
  const { reduced } = useMotionPreference();
  // Scroll drives one artifact through the bench and back: discover, design, build, verify (issue caught), verify (fixed), ship.
  const raw = useChapterStep("process", 6);
  const [pickd, setPickd] = useState<{ i: number; at: number } | null>(null);
  const s6 = reduced ? 5 : raw;
  const stage = pickd && pickd.at === raw ? pickd.i : [0, 1, 2, 3, 3, 4][s6];
  const fix = pickd && pickd.at === raw ? pickd.i > 3 : s6 >= 4;
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  // Measurement guide that follows the pointer over the workbench only (one rAF, fine pointer, no particles).
  useEffect(() => {
    const el = box.current;
    if (!el || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => { raf = 0; el.style.setProperty("--gx", `${x}px`); el.style.setProperty("--gy", `${y}px`); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top; el.dataset.guide = "on"; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { el.dataset.guide = "off"; };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);
  const pick = (i: number) => setPickd({ i, at: raw });
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = Math.min(4, stage + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = Math.max(0, stage - 1);
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };
  const on = (n: number) => stage >= n;
  const cur = steps[stage];

  const stations: [string, string[]][] = [
    ["Brief, users, constraints, outcome", ["REQUIREMENTS", "USERS", "CONSTRAINTS", "OUTCOME"]],
    ["Flow, wireframe, architecture", ["FLOW", "WIREFRAME", "SYSTEM MAP"]],
    ["Components, API, data", ["COMPONENTS", "API", "DATA"]],
    ["Responsive, tests, edge cases", ["RESPONSIVE", "TEST SUITE", "PERMISSIONS"]],
    ["Deploy, monitor, iterate", ["BUILD", "RELEASE", "MONITOR"]],
  ];
  return (
    <section id="process" className="proc" data-scroll="pin" aria-labelledby="process-title">
      <div className="proc__sticky">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.process.eyebrow}</p>
          <h2 id="process-title" className="h2">{copy.process.title}</h2>
        </Reveal>
        <div className="wbx">
          <div className="wbx__tabs" role="tablist" aria-label="How we build" onKeyDown={onKey}>
            {steps.map((s, i) => {
              const Ic = icons[i];
              const st = stage > i ? "done" : stage === i ? "active" : "idle";
              return (
                <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`px-${s.id}`} aria-selected={stage === i} aria-controls="px-panel" tabIndex={stage === i ? 0 : -1} className="pxg__tab" data-st={st} onClick={() => pick(i)}>
                  <span className="pxg__ic">{st === "done" ? <Check aria-label="done" /> : <Ic aria-hidden />}</span>
                  <span className="mono">{s.n}</span><b>{s.word}</b>
                </button>
              );
            })}
          </div>
          <p className="pxg__line" aria-live="polite">{cur.line}</p>
          <div id="px-panel" role="tabpanel" aria-labelledby={`px-${cur.id}`} className="wb" ref={box} data-s={stage} style={{ ["--z" as string]: stage }}>
            <div className="wb__bench" aria-hidden>
              <i className="wb__guide wb__guide--x" /><i className="wb__guide wb__guide--y" />
              <div className="wb__rule" />
              <ul className="wb__out mono" aria-hidden>
                {OUT.map(([t, at]) => <li key={t} data-on={stage >= at}>{stage >= at ? <Check /> : null}{t}</li>)}
              </ul>
              <div className="wb__note" key={stage}><ul>{stations[stage][1].map((c) => <li key={c} className="mono">{c}</li>)}</ul><p>{stations[stage][0]}</p></div>
              <div className="wb__art">
                <div className="wb__face wb__face--note" data-on={stage === 0}><span className="mono">BRIEF</span><p>Client portal: accounts, requests, payments, admin</p>
                  <div className="px-reqs">{[[Users, "Users"], [Plug, "Systems"], [ClipboardList, "Rules"]].map(([Ic, t]) => { const I = Ic as LucideIcon; return <span key={t as string}><I />{t as string}</span>; })}</div>
                </div>
                <div className="wb__face wb__face--wire" data-on={stage === 1}>
                  <div className="wb__flow">{["Sign in", "Request", "Pay"].map((t) => <span key={t}>{t}</span>)}</div>
                  <div className="wb__wf"><u /><u /><u /><s /></div>
                </div>
                <div className="wb__face wb__face--ui" data-on={stage >= 2}>
                  <div className="px-win__bar"><i /><i /><i /><b className="mono">Client portal</b></div>
                  <div className="wb__ui"><u /><u /><u /><button type="button" tabIndex={-1}>Submit request</button></div>
                  <div className="wb__chips" data-on={stage >= 2}><span><Database />Data</span><span><Plug />API</span><span><LayoutTemplate />UI</span><span><Smartphone />Mobile</span></div>
                </div>
                <div className="wb__test" data-on={stage === 3}>
                  <b className="mono">CHECKS</b>
                  {[["Interface", "ok"], ["API", "ok"], ["Responsive", "ok"], ["Empty state", fix ? "ok" : "bad"]].map(([t, s]) => (
                    <span key={t} data-t={s}>{s === "ok" ? <Check aria-hidden /> : <TriangleAlert aria-hidden />}{t}{s === "bad" ? " (caught)" : t === "Empty state" ? " (fixed)" : ""}</span>
                  ))}
                </div>
                <div className="wb__live" data-on={stage === 4}><strong><Rocket />LIVE</strong><em><Gauge />Monitoring on</em></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Aperture kind="live" />
    </section>
  );
}
