"use client";
import { useEffect, useRef } from "react";

/**
 * Seam between two chapters. Progress `--p` (0 to 1) follows native scroll while the seam is near the viewport,
 * so every handoff is immediate, reversible and leaves nothing running when you stop. Each `type` draws its own
 * handoff in CSS from that one number (transform and opacity only). Reduced motion shows the resolved state.
 */
export type BoundaryType =
  | "handoff" | "compress" | "expand" | "depth" | "fragment" | "awaken" | "morph"
  | "continuity" | "flatten" | "recompress" | "light" | "focus" | "brand";

export function ChapterBoundary({ type }: { type: BoundaryType }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0, on = false;
    const calc = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.96 - r.top) / (vh * 0.5)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; calc(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll, { passive: true }); }
      else if (!e.isIntersecting && on) { on = false; calc(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); }
    }, { rootMargin: "20% 0px 20% 0px" });
    io.observe(el);
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="cb" ref={ref} data-type={type} style={{ ["--p" as string]: 0 }} aria-hidden>
      <div className="cb__in"><i /><i /><i /><i /><i /></div>
    </div>
  );
}
