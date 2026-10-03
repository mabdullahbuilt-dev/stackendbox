"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { loadGsap } from "@/lib/gsap";
import { useMedia } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { ButtonLink } from "@/components/ui/Button";
import { Magnet } from "@/components/vendor/Magnet";

const THUMBS = ["crm", "ai", "api", "product", "automation", "integration"] as const;
const POS: [number, number][] = [[-38, -30], [36, -34], [-44, 10], [42, 14], [-26, 38], [26, 40]];

/** Text-free fragments echoing earlier sections. Decorative and aria-hidden. */
function Thumb({ kind }: { kind: (typeof THUMBS)[number] }) {
  return (
    <div className="fthumb__in" data-kind={kind}>
      <i className="th-bar" />
      {kind === "crm" && <div className="th-cols">{[0, 1, 2].map((c) => <div key={c}><i /><i /></div>)}</div>}
      {kind === "ai" && <><i className="th-bub" /><i className="th-bub th-bub--r" /><i className="th-bub" /></>}
      {kind === "api" && <div className="th-tiles">{[0, 1, 2, 3].map((r) => <i key={r} />)}</div>}
      {kind === "product" && <div className="th-bars">{[30, 50, 40, 70, 60, 85].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>}
      {kind === "automation" && [0, 1, 2, 3].map((r) => <i key={r} className="th-row" />)}
      {kind === "integration" && [0, 1, 2].map((r) => <i key={r} className="th-tg" />)}
    </div>
  );
}

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
      const { gsap } = await loadGsap();
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(el);
        const thumbs = q<HTMLElement>(".fthumb");
        const mark = q(".final__mark");
        const W = el.clientWidth;
        const H = el.clientHeight;
        thumbs.forEach((t, i) => gsap.set(t, { x: (POS[i][0] / 100) * W, y: (POS[i][1] / 100) * H, autoAlpha: 0.25, scale: 1, rotation: [-3, 2, 3, -2, 2, -3][i] }));
        gsap.set(mark, { opacity: 0, scale: 0.92 });
        const mr = (mark[0] as HTMLElement).getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const cx = mr.left + mr.width / 2 - box.left - W / 2;
        const cy = mr.top + mr.height / 2 - box.top - H / 2;
        const tl = gsap.timeline({ paused: true });
        thumbs.forEach((t, i) => tl.to(t, { x: cx, y: cy + i * 6, rotation: 0, scale: 0.3, duration: 0.6, ease: "power2.inOut" }, i * 0.04));
        tl.to(thumbs, { autoAlpha: 0, duration: 0.2, ease: "none" }, 0.7);
        tl.to(mark, { opacity: 1, scale: 1, duration: 0.2, ease: "none" }, 0.7);
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { tl.play(); io.disconnect(); } }, { threshold: 0.6 });
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
      <span className="final__ghost" aria-hidden>
        <Image src="/brand/mark.png" alt="" width={406} height={481} />
      </span>
      {animate && (
        <div className="final__thumbs" aria-hidden>
          {THUMBS.map((k) => <div key={k} className="fthumb"><Thumb kind={k} /></div>)}
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
          <Magnet><ButtonLink href="/#start" size="lg" onClick={() => track("cta_click", { placement: "final" })}>{copy.final.primary}</ButtonLink></Magnet>
          <ButtonLink href="/#work" variant="secondary" size="lg" arrow={false} onClick={() => track("cta_click", { placement: "final-work" })}>{copy.final.secondary}<ArrowRight className="arrow" aria-hidden /></ButtonLink>
        </div>
      </div>
    </section>
  );
}
