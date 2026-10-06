"use client";
import { Activity, ArrowRight, BarChart3, Check, CircleAlert, FlaskConical, KeyRound, LockOpen, Lock, Network, Rocket, Smartphone, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useChapterStep } from "@/lib/chapters";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";

const FIXES = [
  { bad: "Messy interface", good: "Refined interface" },
  { bad: "No mobile layout", good: "Responsive" },
  { bad: "No sign in", good: "Auth and roles" },
  { bad: "Hand-built endpoints", good: "API layer" },
  { bad: "No tests", good: "Tests passing" },
  { bad: "Missing reporting", good: "Reports added" },
  { bad: "Manual deploy", good: "Repeatable deploy" },
  { bad: "No monitoring", good: "Monitoring on" },
] as const;
const LAST = FIXES.length;
/** Visitor-facing stages. Each starts after this many fixes have landed. */
const STAGES = [["DIAGNOSE", 0], ["REDESIGN", 1], ["HARDEN", 3], ["EXTEND", 6], ["SHIP", 7]] as const;
/** Diagnostic hotspots on the product: the fix that resolves each one, and where it sits. */
const PINS = [
  { k: "RESPONSIVE", fix: 1, x: 80, y: 40 },
  { k: "AUTH", fix: 2, x: 44, y: 56 },
  { k: "API", fix: 3, x: 56, y: 30 },
  { k: "TESTS", fix: 4, x: 22, y: 47 },
  { k: "REPORTS", fix: 5, x: 40, y: 17 },
  { k: "DEPLOYMENT", fix: 6, x: 74, y: 10 },
] as const;

/** One imperfect application, improved in place as the visitor scrolls (and back again when scrolling up). */
export function ProductRescue() {
  const { reduced } = useMotionPreference();
  // Scroll improves the product in place and reverses it on the way back; a stage click jumps until the next scroll step.
  const raw = useChapterStep("rescue", LAST + 1);
  const [pickd, setPickd] = useState<{ v: number; at: number } | null>(null);
  const step = reduced ? LAST : pickd && pickd.at === raw ? pickd.v : raw;
  const box = useRef<HTMLDivElement>(null);
  const r = copy.rescue;

  const fixed = (i: number) => step > i;
  const stage = STAGES.reduce((acc, [, t], i) => (step >= t ? i : acc), 0);
  const jump = (i: number) => setPickd({ v: i === STAGES.length - 1 ? LAST : STAGES[i][1], at: raw });
  const lens = step < LAST;

  // Diagnostic lens: before the work is done the pointer is a lens; pins near it expand. Gone once resolved.
  useEffect(() => {
    const el = box.current;
    if (!el || reduced || !lens || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${x - r.left}px`); el.style.setProperty("--ly", `${y - r.top}px`);
      el.querySelectorAll<HTMLElement>(".rx-pin").forEach((p) => { const b = p.getBoundingClientRect(); p.dataset.near = String(Math.hypot(b.left + b.width / 2 - x, b.top + b.height / 2 - y) < 80); });
    };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; el.dataset.lens = "on"; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { el.dataset.lens = "off"; el.querySelectorAll<HTMLElement>(".rx-pin").forEach((p) => { p.dataset.near = "false"; }); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, [lens, reduced]);
  return (
    <section id="rescue" className="section rescue" aria-labelledby="rescue-title">
      <div className="container rescue__in">
        <div className="rescue__copy">
          <p className="eyebrow">{r.eyebrow}</p>
          <h2 id="rescue-title" className="h2">{r.titleA}<br />{r.titleB}</h2>
          <p className="body-l">{r.support}</p>
          <ol className="rx-stages" aria-label="Improvement stages">
            {STAGES.map(([t], i) => (
              <li key={t}><button type="button" className="rx-stage mono" data-st={i < stage ? "done" : i === stage ? "active" : "idle"} aria-current={i === stage ? "step" : undefined} onClick={() => jump(i)}>{i < stage ? <Check aria-hidden /> : null}{t}</button></li>
            ))}
          </ol>
          <div className="rescue__ctas">
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "rescue" }); goToBuilder(e, "Custom Software", "Existing Product"); }}>{r.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>

        <div className="rx" ref={box} aria-hidden data-step={step} data-lens="off">
          <i className="rx-lens" data-on={lens} />
          {PINS.map((p) => <span key={p.k} className="rx-pin mono" data-ok={fixed(p.fix)} data-near="false" style={{ left: `${p.x}%`, top: `${p.y}%` }}><i />{p.k}</span>)}
          <div className="rx-app" data-ui={fixed(0)}>
            <div className="rx-app__bar"><i /><i /><i /><b>Customer portal</b></div>
            <div className="rx-app__body">
              {[0, 1, 2, 3].map((i) => <div key={i} className={`rx-card rx-card--${i}`}><u /><u /><s /></div>)}
              <button type="button" tabIndex={-1} className="rx-cta">Continue</button>
            </div>
            <span className="rx-toast" data-on={!fixed(0)}><CircleAlert aria-hidden />Request failed</span>
            <span className="rx-gate" data-ok={fixed(2)}>{fixed(2) ? <Lock aria-hidden /> : <LockOpen aria-hidden />}{fixed(2) ? "Signed in" : "Open to anyone"}</span>
          </div>

          <div className="rx-phone" data-ok={fixed(1)}>
            <span />
            <div className="rx-phone__in"><u /><u /><s /><button type="button" tabIndex={-1}>Continue</button></div>
            <em className="mono">{fixed(1) ? <><Check aria-hidden /> RESPONSIVE</> : <><X aria-hidden /> NO MOBILE LAYOUT</>}</em>
          </div>

          <ul className="rx-checks">
            {FIXES.map((f, i) => {
              const ok = fixed(i);
              const Ic = [Activity, Smartphone, KeyRound, Network, FlaskConical, BarChart3, Rocket, Activity][i];
              return (
                <li key={f.bad} data-ok={ok} data-now={step === i + 1}>
                  <span className="rx-checks__ic"><Ic aria-hidden /></span>
                  <b>{ok ? f.good : f.bad}</b>
                  {ok ? <Check className="rx-checks__s" aria-label="fixed" /> : <TriangleAlert className="rx-checks__s" aria-label="needs work" />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
