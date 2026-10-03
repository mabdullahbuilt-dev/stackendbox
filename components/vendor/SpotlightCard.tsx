"use client";
/**
 * Adapted from React Bits "Spotlight Card".
 * Source: https://reactbits.dev/components/spotlight-card (github.com/DavidHDev/react-bits, src/content/Components/SpotlightCard)
 * Copied/adapted: 2026-10-03
 * Changes: rAF-throttled pointer tracking, pointer-fine gating, spotlight colour rgba(65,105,255,.14) at 320px,
 * renders an element with a 1px border-glow layer; reduced motion gives a static border. Styling lives in styles/sections.css (.spot).
 */
import { useRef, type ReactNode } from "react";

export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
    });
  };
  return (
    <div ref={ref} className={`spot ${className}`} onPointerMove={move}>
      {children}
    </div>
  );
}
