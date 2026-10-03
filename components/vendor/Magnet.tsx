"use client";
/**
 * Adapted from React Bits "Magnet".
 * Source: https://reactbits.dev/animations/magnet (github.com/DavidHDev/react-bits, src/content/Animations/Magnet)
 * Copied: 2026-10-03
 * Changes: strength divisor 5 / padding 60 per StackEndBox spec; disabled on coarse pointers
 * and reduced motion; rAF-throttled; listener only attached while the pointer is near.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionPreference } from "@/lib/useMotionPreference";

export function Magnet({ children, padding = 60, strength = 5 }: { children: ReactNode; padding?: number; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let active = false;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding;
        if (near) {
          active = true;
          el.style.transition = "transform 0.3s ease-out";
          el.style.transform = `translate3d(${dx / strength}px, ${dy / strength}px, 0)`;
        } else if (active) {
          active = false;
          el.style.transition = "transform 0.5s ease-in-out";
          el.style.transform = "translate3d(0,0,0)";
        }
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [padding, strength, reduced]);

  return (
    <span ref={ref} style={{ display: "inline-block" }}>
      {children}
    </span>
  );
}
