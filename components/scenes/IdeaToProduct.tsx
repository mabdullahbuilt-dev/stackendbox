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

const THRESH = [0, 0.1, 0.25, 0.45, 0.55, 0.75, 0.85, 0.95];

function build(gsap: typeof import("gsap").gsap, root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  gsap.set(q(".ip-wire"), { autoAlpha: 0, scale: 0.92 });
  gsap.set(q(".ip-ui"), { clipPath: "inset(0 100% 0 0)" });
  gsap.set(q(".ip-edge"), { autoAlpha: 0, left: 60 });
  gsap.set(q(".ip-schema"), { autoAlpha: 0, y: 0, scale: 1 });
  gsap.set(q(".ip-auth"), { autoAlpha: 0, y: -18 });
  gsap.set(q(".ip-api"), { autoAlpha: 0, x: 30 });
  gsap.set(q(".ip-bill"), { autoAlpha: 0, y: 24 });
  gsap.set(q(".ip-admin"), { autoAlpha: 0, x: -30, scale: 0.92 });
  gsap.set(q(".ip-live"), { autoAlpha: 0 });
  gsap.set(q(".ip-briefdone"), { autoAlpha: 0 });
  // 01 BRIEF → compress; 02 WIREFRAME
  tl.to(q(".ip-brief"), { scale: 0.32, x: -270, y: -150, autoAlpha: 0, duration: 0.15 }, 0.1);
  tl.to(q("[data-lo]"), { autoAlpha: 0, scale: 0.9, duration: 0.12, stagger: 0.01 }, 0.1);
  tl.to(q(".ip-briefdone"), { autoAlpha: 1, duration: 0.05 }, 0.22);
  tl.to(q(".ip-wire"), { autoAlpha: 1, scale: 1, duration: 0.15 }, 0.12);
  // 03 INTERFACE: mask wipe left → right with a 1px blue edge
  tl.to(q(".ip-ui"), { clipPath: "inset(0 0% 0 0)", duration: 0.2, ease: "power2.inOut" }, 0.25);
  tl.fromTo(q(".ip-edge"), { autoAlpha: 1, left: 60 }, { autoAlpha: 0, left: 700, duration: 0.2, ease: "power2.inOut", immediateRender: false }, 0.25);
  tl.to(q(".ip-wire"), { autoAlpha: 0, duration: 0.05 }, 0.44);
  // 04 DATA: schema slides behind
  tl.to(q(".ip-schema"), { autoAlpha: 0.75, y: 28, scale: 0.94, duration: 0.14 }, 0.45);
  // 05 ACCESS + API
  tl.to(q(".ip-auth"), { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, 0.55);
  tl.to(q(".ip-api"), { autoAlpha: 1, x: 0, duration: 0.12, ease: "power3.out" }, 0.65);
  // 06 BILLING
  tl.to(q(".ip-bill"), { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, 0.75);
  // 07 ADMIN
  tl.to(q(".ip-admin"), { autoAlpha: 1, x: 48, scale: 0.92, duration: 0.1 }, 0.85);
  // 08 LIVE
  tl.to(q(".ip-live"), { autoAlpha: 1, duration: 0.05 }, 0.95);
  tl.to({}, { duration: 0 }, 1);
  return tl;
}

function Stepper() {
  const { reduced } = useMotionPreference();
  const [s, setS] = useState(0);
  const frames = [
    { cap: "01 BRIEF · 02 WIREFRAME", node: (
      <div className="ipm"><div className="ipm-card"><b className="mono">Brief.md</b><ul><li>Customers book and pay online</li><li>Staff manage bookings</li><li>Admin sees reports</li></ul></div>
      <div className="ipm-card ipm-wire"><i className="wb wb--h" /><i className="wb wb--t" /><i className="wb wb--big" /></div></div>) },
    { cap: "03 INTERFACE · 04 DATA", node: (
      <div className="ipm"><div className="ipm-card"><div className="mk-row"><b>Workspace</b><Pill tone="cyan">SAMPLE</Pill></div><div className="mk-tiles"><div className="mk-tile"><span className="mono mono--muted">MEMBERS</span><b>8</b></div><div className="mk-tile"><span className="mono mono--muted">PROJECTS</span><b>24</b></div><div className="mk-tile"><span className="mono mono--muted">SEATS</span><b>8/10</b></div></div><Line w="80%" /><Line w="60%" /></div>
      <div className="ipm-card"><div className="mk-row"><b className="mono">SCHEMA</b><Pill tone="cyan">postgres</Pill></div><span className="mk-sub">users · plans · bookings · invoices</span></div></div>) },
    { cap: "05 ACCESS · 06 BILLING · 07 ADMIN · 08 LIVE", node: (
      <div className="ipm"><div className="ipm-card"><div className="mk-row"><b>Workspace</b><Pill tone="green">LIVE</Pill></div><span className="mk-sub">Production build ✓</span></div>
      <div className="ipm-chips"><Pill tone="blue">ACCESS · ROLES</Pill><Pill tone="green">API · 200</Pill><Pill tone="green">BILLING · ACTIVE</Pill><Pill>ADMIN</Pill></div></div>) },
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
          trigger: pin.current, start: "top top", end: desktop ? "+=150%" : "+=120%", pin: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true, animation: tl,
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
      <a href="#integrations" className="skip-link">Skip product scene</a>
      <div className="ipsec__pin" ref={pin}>
        <div className="container">
          <div className="ipsec__head">
            <p className="eyebrow">{copy.product.eyebrow}</p>
            <h2 id="product-title" className="h2">{copy.product.title}</h2>
            <p className="body-l">{copy.product.support}</p>
          </div>

          <div className="ipsec__body">
            <ol className="iprail mono" ref={rail} data-active="7" aria-label="Stages">
              {copy.product.captions.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <div className="ipsec__stage" ref={stage}>
              {mode === "stepper" ? <Stepper /> : mode === "static" ? (
                <div className="ipframes">
                  <Frozen at={0.02} label="01 BRIEF" />
                  <Frozen at={0.46} label="03 INTERFACE · 04 DATA" />
                  <Frozen at={1} label="08 LIVE" />
                </div>
              ) : (
                <div aria-hidden><FitBox><IdeaStage /></FitBox></div>
              )}
              <p className="sr-only">From a written brief, to a wireframe, to a finished interface with a database behind it, sign-in and roles, an API, billing and an admin area — then live in production. Shown with sample data.</p>
            </div>
          </div>

          <div className="ipsec__foot">
            <Link href="/#start" className="link-cta" onClick={() => { track("capability_intent_cta_click", { capability: "product", placement: "idea" }); presetBuilder("Product"); }}>{copy.product.cta}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
