"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { copy } from "@/content/copy";
import { goToBuilder } from "@/lib/intent";
import { track } from "@/lib/analytics";
import { onProgress } from "@/lib/chapters";
import { useMedia } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { ButtonLink } from "@/components/ui/Button";
import { Magnet } from "@/components/vendor/Magnet";
import { CalButton } from "@/components/ui/CalButton";
import { siteConfig } from "@/site.config";

const THUMBS = ["software", "ai", "data", "integration", "mobile", "product", "issue"] as const;
const POS: [number, number][] = [[-38, -30], [36, -34], [-44, 10], [42, 14], [-26, 38], [26, 40], [4, -40]];

/** Text-free fragments echoing earlier sections. Decorative and aria-hidden. */
function Thumb({ kind }: { kind: (typeof THUMBS)[number] }) {
  return (
    <div className="fthumb__in" data-kind={kind}>
      <i className="th-bar" />
      {kind === "software" && <div className="th-cols">{[0, 1, 2].map((c) => <div key={c}><i /><i /></div>)}</div>}
      {kind === "ai" && <><i className="th-bub" /><i className="th-bub th-bub--r" /><i className="th-bub" /></>}
      {kind === "data" && <div className="th-bars">{[30, 50, 40, 70, 60, 85].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>}
      {kind === "integration" && [0, 1, 2].map((r) => <i key={r} className="th-tg" />)}
      {kind === "mobile" && <div className="th-phone"><i /><i /><i /></div>}
      {kind === "product" && <div className="th-tiles">{[0, 1, 2, 3].map((r) => <i key={r} />)}</div>}
      {kind === "issue" && [0, 1, 2, 3].map((r) => <i key={r} className="th-row" />)}
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

  // Scroll drives the convergence (and reverses it): fragments travel in orange, turn green once aligned on the mark,
  // the red problem fragment fades out on the way, then the mark resolves. Transform/opacity only, no animation library,
  // no loop: work happens only when the chapter's scroll progress changes.
  useEffect(() => {
    const el = root.current;
    if (!animate || !el) return;
    const thumbs = [...el.querySelectorAll<HTMLElement>(".fthumb")];
    const mark = el.querySelector<HTMLElement>(".final__mark");
    if (!mark) return;
    const ROT = [-3, 2, 3, -2, 2, -3, 1];
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    let geo = { W: 0, H: 0, cx: 0, cy: 0 };
    const measure = () => {
      const box = el.getBoundingClientRect(), mr = mark.getBoundingClientRect();
      geo = { W: el.clientWidth, H: el.clientHeight, cx: mr.left + mr.width / 2 - box.left - el.clientWidth / 2, cy: mr.top + mr.height / 2 - box.top - el.clientHeight / 2 };
    };
    const paint = (p: number) => {
      const t = clamp((p - 0.05) / 0.75);
      thumbs.forEach((th, i) => {
        th.style.visibility = "visible";
        if (THUMBS[i] === "issue") { const k = clamp(t / 0.3); th.style.opacity = String(0.25 * (1 - k)); th.style.transform = `translate(${(POS[i][0] / 100) * geo.W}px, ${(POS[i][1] / 100) * geo.H}px) scale(${1 - 0.4 * k})`; return; }
        const k = ease(clamp((t - i * 0.04) / 0.6));
        const x = (POS[i][0] / 100) * geo.W * (1 - k) + geo.cx * k, y = (POS[i][1] / 100) * geo.H * (1 - k) + (geo.cy + i * 6) * k;
        th.style.transform = `translate(${x}px, ${y}px) rotate(${ROT[i] * (1 - k)}deg) scale(${1 - 0.7 * k})`;
        th.style.opacity = String(t > 0.7 ? 0.25 + 0.75 * Math.min(1, k) * (1 - clamp((t - 0.7) / 0.2)) : 0.25 + 0.75 * Math.min(1, k));
        th.style.borderColor = k >= 0.97 ? "rgba(47,210,122,0.85)" : k > 0.02 ? "rgba(255,122,26,0.9)" : "";
      });
      const m = clamp((t - 0.7) / 0.2);
      mark.style.opacity = String(m); mark.style.transform = `scale(${0.92 + 0.08 * m})`;
    };
    measure();
    let last = 0;
    const off = onProgress("final", (p) => { last = p; paint(p); });
    const ro = new ResizeObserver(() => { measure(); paint(last); });
    ro.observe(el);
    return () => { off(); ro.disconnect(); thumbs.forEach((th) => { th.style.cssText = ""; }); mark.style.opacity = ""; mark.style.transform = ""; };
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
          <Magnet><ButtonLink href="/#start" size="lg" onClick={(e) => { track("cta_click", { placement: "final" }); goToBuilder(e); }}>{copy.final.primary}</ButtonLink></Magnet>
          {siteConfig.calUrl ? (
            <CalButton placement="final" />
          ) : (
            <ButtonLink href="/#work" variant="secondary" size="lg" arrow={false} onClick={() => track("cta_click", { placement: "final-work" })}>{copy.final.secondary}<ArrowRight className="arrow" aria-hidden /></ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
