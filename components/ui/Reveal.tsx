"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Entrance: 24px rise, 600ms ease-out, CSS only. One shared IntersectionObserver for every Reveal on the page.
 * Resets when the element leaves the viewport and replays on re-entry. Content is present (visible) in SSR HTML
 * until JavaScript arms it, so nothing is hidden without scripts. Reduced motion: no movement.
 */
let io: IntersectionObserver | null = null;
const getIO = () => io ?? (io = new IntersectionObserver((es) => es.forEach((e) => { (e.target as HTMLElement).dataset.in = e.isIntersecting ? "true" : "false"; }), { rootMargin: "0px 0px -10% 0px" }));

export function Reveal({ children, delay = 0, as = "div", className, y = 24 }: { children: ReactNode; delay?: number; as?: "div" | "section" | "li" | "p" | "span"; className?: string; y?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.dataset.in = r.top < innerHeight && r.bottom > 0 ? "true" : "false";
    el.dataset.armed = "true";
    const o = getIO();
    o.observe(el);
    return () => o.unobserve(el);
  }, []);
  const Tag = as as "div";
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${className ?? ""}`} style={{ ["--rv-d" as string]: `${delay * 1000}ms`, ["--rv-y" as string]: `${y}px` }}>
      {children}
    </Tag>
  );
}
