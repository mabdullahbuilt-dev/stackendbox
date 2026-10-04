"use client";
import { Activity, ArrowRight, Check, CircleAlert, FlaskConical, KeyRound, LockOpen, Lock, Network, Rocket, Smartphone, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";

const FIXES = [
  { bad: "Messy interface", good: "Refined interface" },
  { bad: "No mobile layout", good: "Responsive" },
  { bad: "No sign in", good: "Auth and roles" },
  { bad: "Hand-built endpoints", good: "API layer" },
  { bad: "No tests", good: "Tests passing" },
  { bad: "Manual deploy", good: "Repeatable deploy" },
  { bad: "No monitoring", good: "Monitoring on" },
] as const;
const LAST = FIXES.length;

/** One imperfect application, improved in place. Plays once when seen, then rests. */
export function ProductRescue() {
  const { reduced } = useMotionPreference();
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-20% 0px -20% 0px");
  const played = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const r = copy.rescue;

  const play = () => {
    clearInterval(timer.current);
    let k = 0;
    setStep(0);
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= LAST) clearInterval(timer.current); }, 800);
  };
  useEffect(() => { if (reduced) setStep(LAST); }, [reduced]);
  useEffect(() => {
    if (reduced || !inView || played.current) return;
    played.current = true;
    const t = setTimeout(play, 600);
    return () => clearTimeout(t);
  }, [inView, reduced]);
  useEffect(() => () => clearInterval(timer.current), []);

  const fixed = (i: number) => step > i;
  return (
    <section id="rescue" className="section rescue" aria-labelledby="rescue-title">
      <div className="container rescue__in">
        <div className="rescue__copy">
          <p className="eyebrow">{r.eyebrow}</p>
          <h2 id="rescue-title" className="h2">{r.titleA}<br />{r.titleB}</h2>
          <div className="rescue__ctas">
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "rescue" }); goToBuilder(e, "Custom Software", "Existing Product"); }}>{r.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>

        <div className="rx" ref={box} aria-hidden data-step={step}>
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
              const Ic = [Activity, Smartphone, KeyRound, Network, FlaskConical, Rocket, Activity][i];
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
