"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { FINE_POINTER, useMedia } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { planes, SETS } from "./planes";

export function UnderInterface() {
  const { reduced } = useMotionPreference();
  const desktop = useMedia("(min-width: 1024px)", true);
  const tablet = useMedia("(min-width: 600px)", true);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const pin = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const items = useMemo(() => (!mounted || desktop ? SETS.p9 : tablet ? SETS.p7 : SETS.p5).map((k) => planes[k]), [mounted, desktop, tablet]);
  const n = items.length;
  const gapFinal = n === 9 ? 64 : n === 7 ? 48 : 30;
  const mobile = mounted && !tablet;
  useEffect(() => setMounted(true), []);

  // GSAP: animates CSS variables only (--g per plane, --rx/--rz on the wrapper, rail items).
  useEffect(() => {
    if (!mounted || reduced || !pin.current || !wrap.current) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(wrap.current!);
        const pls = q<HTMLElement>(".pln");
        const labels = q<HTMLElement>(".ui-rail li");
        gsap.set(pls, { "--g": 0 });
        gsap.set(wrap.current!, { "--rx": 0, "--rz": 0, "--sc": 1 });
        gsap.set(labels, { opacity: 0, x: -12 });
        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
        tl.to(wrap.current!, { "--rx": 58, "--rz": -38, "--sc": 0.7, duration: 0.45 }, 0.1);
        tl.to(pls, { "--g": gapFinal, duration: 0.4, stagger: 0.035 }, 0.1);
        tl.to(labels, { opacity: 1, x: 0, duration: 0.2, stagger: 0.035, ease: "power3.out" }, 0.35);
        pls.forEach((p, i) => {
          tl.to(p, { "--scan": 1, duration: 0.03, yoyo: true, repeat: 1, ease: "none" }, 0.76 + i * (0.12 / pls.length));
        });
        tl.to(labels, { opacity: 0, x: -12, duration: 0.08 }, 0.88);
        tl.to(pls, { "--g": 0, duration: 0.12 }, 0.88);
        tl.to(wrap.current!, { "--rx": 0, "--rz": 0, "--sc": 1, duration: 0.12 }, 0.88);
        tl.to({}, { duration: 0 }, 1);
        let done = false;
        const mobileNow = window.matchMedia("(max-width: 599px)").matches;
        ScrollTrigger.create({
          trigger: pin.current,
          start: mobileNow ? "top 70%" : "top top",
          end: mobileNow ? "bottom 40%" : window.matchMedia("(min-width: 1024px)").matches ? "+=160%" : "+=130%",
          pin: !mobileNow,
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
          animation: tl,
          onUpdate: (self) => {
            if (!done && self.progress >= 0.9) { done = true; track("scene_complete", { scene: "under_interface" }); }
          },
        });
      }, wrap.current!);
      cleanup = () => ctx.revert();
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [mounted, reduced, n, gapFinal]);

  // Pointer depth parallax (fine pointers only)
  useEffect(() => {
    const el = stack.current;
    if (!el || reduced || !window.matchMedia(FINE_POINTER).matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", String(((e.clientX - r.left) / r.width) * 2 - 1));
        el.style.setProperty("--py", String(((e.clientY - r.top) / r.height) * 2 - 1));
      });
    };
    const leave = () => { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [reduced]);

  const staticMode = reduced;
  return (
    <section id="depth" className="ui section--alt" aria-labelledby="depth-title">
      <a href="#breadth" className="skip-link">Skip engineering depth scene</a>
      <div className="ui__pin" ref={pin}>
        <div className="container">
          <div className="ui__head">
            <div>
              <p className="eyebrow">{copy.depth.eyebrow}</p>
              <h2 id="depth-title" className="h2">{copy.depth.title}</h2>
            </div>
            <p className="body-l">{copy.depth.support}</p>
          </div>

          <div className="ui__body" ref={wrap} data-static={staticMode} style={{ ["--n" as string]: n, ["--gf" as string]: `${gapFinal}px` }}>
            <div className="ui__stage" ref={stack}>
              <div className="ui__persp" role="img" aria-label="Nine layers of an application, from interface to deployment">
                <div className="ui__tilt">
                  {items.map((p, i) => (
                    <div
                      key={p.id}
                      className="pln"
                      style={{ ["--i" as string]: n - 1 - i }}
                      data-active={active === i}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                    >
                      <span className="pln__t mono">{String(i + 1).padStart(2, "0")} {p.title}</span>
                      <div className="pln__art" aria-hidden>{p.art}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ol className="ui-rail" aria-label="Layers of an application">
              {items.map((p, i) => (
                <li key={p.id} data-active={active === i} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
                  <span className="mono">{String(i + 1).padStart(2, "0")} {p.title}</span>
                  <span className="body-s">{p.sub}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="ui__foot">
            <Link href="/#start" className="link-cta" onClick={() => { track("capability_intent_cta_click", { capability: "product", placement: "depth" }); presetBuilder("Product"); }}>{copy.depth.cta}</Link>
          </div>
          {mobile && null}
        </div>
      </div>
    </section>
  );
}
