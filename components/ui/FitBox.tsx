"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Renders children in a fixed "design space" (set by CSS --dw/--dh per breakpoint)
 * and scales it uniformly to fit the container. Text stays crisp (transform only).
 */
export function FitBox({ children, className, maxW }: { children: ReactNode; className?: string; maxW?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const s = o.clientWidth / i.offsetWidth;
      o.style.setProperty("--s", String(s));
      o.style.height = `${i.offsetHeight * s}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className={`fit ${className ?? ""}`} style={maxW ? { maxWidth: maxW } : undefined}>
      <div ref={inner} className="fit__in">
        {children}
      </div>
    </div>
  );
}
