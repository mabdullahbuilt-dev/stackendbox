"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { siteConfig } from "@/site.config";
import { track } from "@/lib/analytics";
import { useMedia } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { ButtonLink } from "@/components/ui/Button";
import { After } from "@/components/scenes/manualFaces";
import { Magnet } from "@/components/vendor/Magnet";

const THUMBS = ["analytics", "messages", "crm", "tasks", "automation", "alerts"] as const;
const POS: [number, number][] = [[-38, -30], [36, -34], [-44, 10], [42, 14], [-26, 38], [26, 40]];

export function FinalCTA() {
  const { reduced } = useMotionPreference();
  const wide = useMedia("(min-width: 900px)", true);
  const [mounted, setMounted] = useState(false);
  const root = useRef<HTMLElement>(null);
  const animate = mounted && wide && !reduced;
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = root.current;
    if (!animate || !el) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(el);
        const thumbs = q<HTMLElement>(".fthumb");
        const mark = q(".final__mark");
        const W = el.clientWidth;
        const H = el.clientHeight;
        thumbs.forEach((t, i) => gsap.set(t, { x: (POS[i][0] / 100) * W, y: (POS[i][1] / 100) * H, opacity: 0.25, scale: 1, rotation: [-3, 2, 3, -2, 2, -3][i] }));
        gsap.set(mark, { opacity: 0, scale: 0.92 });
        const marky = (mark[0] as HTMLElement).getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const tl = gsap.timeline({ paused: true });
        const cx = marky.left + marky.width / 2 - box.left - W / 2;
        const cy = marky.top + marky.height / 2 - box.top - H / 2;
        thumbs.forEach((t, i) => {
          tl.to(t, { x: cx, y: cy + i * 6, rotation: 0, scale: 0.3, duration: 0.6, ease: "power2.inOut" }, i * 0.04);
        });
        tl.to(thumbs, { opacity: 0, duration: 0.2, ease: "none" }, 0.7);
        tl.to(mark, { opacity: 1, scale: 1, duration: 0.2, ease: "none" }, 0.7);
        const io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting) { tl.play(); io.disconnect(); }
        }, { threshold: 0.6 });
        io.observe(el);
        cleanup = () => io.disconnect();
      }, el);
      const prev = cleanup;
      cleanup = () => { prev?.(); ctx.revert(); };
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [animate]);

  return (
    <section id="final" ref={root} className="final" aria-labelledby="final-title">
      <span className="final__ghost" aria-hidden>BUILD</span>
      {animate && (
        <div className="final__thumbs" aria-hidden>
          {THUMBS.map((k) => <div key={k} className="fthumb"><div className="fthumb__in">{After[k]}</div></div>)}
        </div>
      )}
      <div className="container final__in">
        <span className="final__mark"><Image src="/brand/mark.png" alt="" width={61} height={72} /></span>
        <p className="eyebrow">{copy.final.eyebrow}</p>
        <h2 id="final-title" className="h-xxl">
          <span className="block">{copy.final.a}</span>
          <span className="block tone2">{copy.final.b}</span>
        </h2>
        <p className="body-l">{copy.final.support}</p>
        <div className="final__ctas">
          <Magnet><ButtonLink href="/#start" size="lg" onClick={() => track("hero_cta_primary_click", { placement: "final" })}>{copy.final.primary}</ButtonLink></Magnet>
          {siteConfig.schedulingUrl && (
            <ButtonLink href={siteConfig.schedulingUrl} variant="secondary" size="lg" onClick={() => track("schedule_call_click", { placement: "final" })}>{copy.final.secondary}</ButtonLink>
          )}
        </div>
        <p className="mono mono--muted">{copy.final.micro}</p>
      </div>
    </section>
  );
}
