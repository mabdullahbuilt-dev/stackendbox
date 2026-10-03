"use client";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useMedia } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { loadGsap } from "@/lib/gsap";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { FitBox } from "@/components/ui/FitBox";
import { Line, Pill } from "@/components/ui/mock";
import { IdeaStage } from "./IdeaStage";

const THRESH = [0, 0.08, 0.18, 0.3, 0.42, 0.52, 0.62, 0.72, 0.84, 0.94];

function build(gsap: typeof import("gsap").gsap, root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  gsap.set(q(".ip-flow li"), { autoAlpha: 0, x: 24 });
  gsap.set(q(".ip-wire"), { autoAlpha: 0, scale: 0.92 });
  gsap.set(q(".ip-ui"), { clipPath: "inset(0 100% 0 0)" });
  gsap.set(q(".ip-edge"), { autoAlpha: 0, left: 40 });
  gsap.set(q(".ip-schema"), { autoAlpha: 0, y: 0, scale: 1 });
  gsap.set(q(".ip-auth"), { autoAlpha: 0, y: -18 });
  gsap.set(q(".ip-api"), { autoAlpha: 0, x: 30 });
  gsap.set(q(".ip-bill"), { autoAlpha: 0, y: 24 });
  gsap.set(q(".ip-admin"), { autoAlpha: 0, x: -30, scale: 0.92 });
  gsap.set(q(".ip-phone"), { autoAlpha: 0, x: 60, y: 20 });
  gsap.set(q(".ip-deploy"), { autoAlpha: 0, y: 14 });
  gsap.set(q(".ip-live"), { autoAlpha: 0 });
  gsap.set(q(".ip-briefdone"), { autoAlpha: 0 });
  // 02 STRUCTURE
  tl.to(q(".ip-flow li"), { autoAlpha: 1, x: 0, duration: 0.07, stagger: 0.016, ease: "power3.out" }, 0.08);
  // 03 WIREFRAME: brief compresses, structure resolves into screens
  tl.to(q(".ip-brief"), { scale: 0.32, x: -150, y: -140, autoAlpha: 0, duration: 0.1 }, 0.18);
  tl.to(q(".ip-flow li"), { autoAlpha: 0, duration: 0.08, stagger: 0.008 }, 0.2);
  tl.to(q(".ip-briefdone"), { autoAlpha: 1, duration: 0.04 }, 0.27);
  tl.to(q(".ip-wire"), { autoAlpha: 1, scale: 1, duration: 0.11 }, 0.2);
  // 04 INTERFACE: mask wipe with a thin edge
  tl.to(q(".ip-ui"), { clipPath: "inset(0 0% 0 0)", duration: 0.12, ease: "power2.inOut" }, 0.3);
  tl.fromTo(q(".ip-edge"), { autoAlpha: 1, left: 40 }, { autoAlpha: 0, left: 600, duration: 0.12, ease: "power2.inOut", immediateRender: false }, 0.3);
  tl.to(q(".ip-wire"), { autoAlpha: 0, duration: 0.04 }, 0.4);
  // 05 BACKEND
  tl.to(q(".ip-schema"), { autoAlpha: 0.9, y: 28, scale: 0.96, duration: 0.07 }, 0.42);
  tl.to(q(".ip-api"), { autoAlpha: 1, x: 0, duration: 0.07, ease: "power3.out" }, 0.46);
  // 06 ACCESS
  tl.to(q(".ip-auth"), { autoAlpha: 1, y: 0, duration: 0.08, ease: "power3.out" }, 0.52);
  // 07 BILLING
  tl.to(q(".ip-bill"), { autoAlpha: 1, y: 0, duration: 0.08, ease: "power3.out" }, 0.62);
  // 08 ADMIN
  tl.to(q(".ip-admin"), { autoAlpha: 1, x: 48, scale: 0.94, duration: 0.09 }, 0.72);
  // 09 MOBILE
  tl.to(q(".ip-phone"), { autoAlpha: 1, x: 0, y: 0, duration: 0.09, ease: "power3.out" }, 0.84);
  // 10 LIVE
  tl.to(q(".ip-deploy"), { autoAlpha: 1, y: 0, duration: 0.04 }, 0.94);
  tl.to(q(".ip-live"), { autoAlpha: 1, duration: 0.03 }, 0.95);
  tl.to({}, { duration: 0 }, 1);
  return tl;
}

function Stepper() {
  const { reduced } = useMotionPreference();
  const [s, setS] = useState(0);
  const frames = [
    { cap: "01 BRIEF, 02 STRUCTURE, 03 WIREFRAME", node: (
      <div className="ipm"><div className="ipm-card"><b className="mono">BRIEF</b><p>{copy.product.brief}</p></div>
      <div className="ipm-card ipm-wire"><i className="wb wb--h" /><i className="wb wb--t" /><i className="wb wb--big" /></div></div>) },
    { cap: "04 INTERFACE, 05 BACKEND", node: (
      <div className="ipm"><div className="ipm-card"><div className="mk-row"><b>Book an appointment</b><Pill tone="blue">Tuesday</Pill></div><div className="ip-book__slots"><div>{["09:00", "10:30", "13:00", "14:30"].map((t, i) => <span key={t} data-on={i === 3}>{t}</span>)}</div><u>Confirm and pay</u></div></div>
      <div className="ipm-card"><div className="mk-row"><b className="mono">DATABASE</b><Pill tone="cyan">postgres</Pill></div><span className="mk-sub">customers · services · bookings · payments</span></div></div>) },
    { cap: "06 ACCESS to 10 LIVE", node: (
      <div className="ipm"><div className="ipm-card"><div className="mk-row"><b>Booking product</b><Pill tone="green">LIVE</Pill></div><span className="mk-sub">Production build passed</span></div>
      <div className="ipm-chips"><Pill tone="blue">ACCESS</Pill><Pill tone="green">API 200</Pill><Pill tone="green">PAYMENTS</Pill><Pill>ADMIN</Pill><Pill>MOBILE</Pill></div></div>) },
  ];
  const go = (n: number) => { setS(n); track("scene_replay", { scene: "idea_to_product" }); };
  return (
    <div className="ipstep">
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={s} initial={reduced ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}>
          {frames[s].node}
        </m.div>
      </AnimatePresence>
      <p className="mono ipstep__cap">{frames[s].cap}</p>
      <div className="ipstep__ctl">
        <button className="icon-btn" aria-label="Back" disabled={s === 0} onClick={() => go(s - 1)}><ArrowLeft /></button>
        <div className="dcar__dots" role="group" aria-label="Stage">{frames.map((_, i) => <button key={i} className="dcar__dot" aria-label={`Stage ${i + 1} of 3`} aria-current={i === s} data-on={i === s} onClick={() => go(i)}><i /></button>)}</div>
        <button className="icon-btn" aria-label="Next" disabled={s === 2} onClick={() => go(s + 1)}><ArrowRight /></button>
      </div>
    </div>
  );
}

function Frozen({ at, label }: { at: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let kill: (() => void) | undefined;
    (async () => {
      const { gsap } = await loadGsap();
      if (!ref.current) return;
      const ctx = gsap.context(() => { build(gsap, ref.current!).progress(at).pause(); }, ref.current);
      kill = () => ctx.revert();
    })();
    return () => kill?.();
  }, [at]);
  return (
    <figure className="ipframe">
      <div ref={ref}><FitBox><IdeaStage /></FitBox></div>
      <figcaption className="mono mono--muted">{label}</figcaption>
    </figure>
  );
}

export function IdeaToProduct() {
  const { reduced } = useMotionPreference();
  const wide = useMedia("(min-width: 600px)", true);
  const [mounted, setMounted] = useState(false);
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const mode = !mounted ? "ssr" : reduced ? "static" : wide ? "scrub" : "stepper";
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mode !== "scrub" || !pin.current || !stage.current) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const tl = build(gsap, stage.current!);
        let done = false;
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        ScrollTrigger.create({
          trigger: pin.current, start: "top top", end: desktop ? "+=140%" : "+=110%", pin: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true, animation: tl,
          onUpdate: (self) => {
            let a = 0;
            THRESH.forEach((t, i) => { if (self.progress >= t) a = i; });
            if (rail.current) rail.current.dataset.active = String(a);
            if (!done && self.progress >= 0.9) { done = true; track("scene_complete", { scene: "idea_to_product" }); }
          },
        });
      }, stage.current!);
      cleanup = () => ctx.revert();
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [mode]);

  return (
    <section id="product" className="ipsec" aria-labelledby="product-title">
      <a href="#founders" className="skip-link">Skip product scene</a>
      <div className="ipsec__pin" ref={pin}>
        <div className="container">
          <div className="ipsec__head">
            <p className="eyebrow">{copy.product.eyebrow}</p>
            <h2 id="product-title" className="h2">{copy.product.title}</h2>
            <p className="body-l">{copy.product.support}</p>
          </div>

          <div className="ipsec__body">
            <ol className="iprail mono" ref={rail} data-active="9" aria-label="Stages">
              {copy.product.captions.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <div className="ipsec__stage" ref={stage}>
              {mode === "stepper" ? <Stepper /> : mode === "static" ? (
                <div className="ipframes">
                  <Frozen at={0.02} label="01 BRIEF" />
                  <Frozen at={0.5} label="04 INTERFACE, 05 BACKEND" />
                  <Frozen at={1} label="10 LIVE" />
                </div>
              ) : (
                <div aria-hidden><FitBox><IdeaStage /></FitBox></div>
              )}
              <p className="sr-only">From a written brief, to a wireframe, to a finished interface with a database behind it, sign-in and roles, an API, billing and an admin area, then live in production. </p>
            </div>
          </div>

          <div className="ipsec__foot">
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("mvp_cta", { placement: "idea" }); presetBuilder("SaaS / MVP"); }}>{copy.product.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
