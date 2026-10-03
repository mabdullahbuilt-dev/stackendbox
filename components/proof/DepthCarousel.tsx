"use client";
/**
 * Depth carousel for the Proof Stage.
 * Behaviour modelled on the React Bits "Depth Carousel" spec (https://reactbits.dev/components/depth-carousel):
 * active card forward, neighbours scaled/dimmed/blurred with distance, drag + wheel + keys + buttons,
 * carousel/slide ARIA roles, reduced-motion aware. This is an original implementation (Motion-based),
 * not a copy of the React Bits source. Date: 2026-10-03.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { m } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionPreference } from "@/lib/useMotionPreference";

type Props = {
  count: number;
  index: number;
  onIndex: (i: number, method: "drag" | "wheel" | "key" | "click" | "button" | "dot") => void;
  label: string;
  renderCard: (i: number, state: { active: boolean; distance: number }) => ReactNode;
  cardLabel: (i: number) => string;
  announce: string;
};

const WINDOW = 2;

export function DepthCarousel({ count, index, onIndex, label, renderCard, cardLabel, announce }: Props) {
  const { reduced } = useMotionPreference();
  const track = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ cw: 700, compact: false });
  const dragged = useRef(false);
  const [live, setLive] = useState("");

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const vw = window.innerWidth;
      const compact = vw < 600;
      const cw = vw >= 900 ? Math.min(760, vw * 0.55) : vw >= 600 ? vw * 0.78 : vw * 0.86;
      setDims({ cw, compact });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // wheel: horizontal intent only (vertical wheel keeps scrolling the page)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let timer = 0;
    const on = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 18) return;
      e.preventDefault();
      if (timer) return;
      timer = window.setTimeout(() => (timer = 0), 130);
      onIndex(Math.max(0, Math.min(count - 1, index + (e.deltaX > 0 ? 1 : -1))), "wheel");
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, [count, index, onIndex]);

  useEffect(() => {
    const t = setTimeout(() => setLive(announce), 300);
    return () => clearTimeout(t);
  }, [announce]);

  const go = useCallback((i: number, method: Parameters<Props["onIndex"]>[1]) => onIndex(Math.max(0, Math.min(count - 1, i)), method), [count, onIndex]);
  const ar = dims.compact ? 520 / 380 : 500 / 760;
  const ch = dims.cw * ar;

  const pos = (d: number) => {
    const a = Math.abs(d);
    const sign = Math.sign(d);
    if (a === 0) return { x: 0, scale: 1, opacity: 1, blur: 0, rot: 0, veil: 0 };
    if (a === 1) return { x: sign * dims.cw * 0.872, scale: 0.88, opacity: dims.compact ? 0.6 : 0.55, blur: dims.compact || reduced ? 0 : 3, rot: reduced ? 0 : -sign * 8, veil: 0.4 };
    return { x: sign * dims.cw * 1.3, scale: 0.8, opacity: 0.15, blur: 0, rot: reduced ? 0 : -sign * 8, veil: 0.7 };
  };

  return (
    <div className="dcar">
      <div
        ref={track}
        className="dcar__track"
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        style={{ height: ch }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, "key"); }
          else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, "key"); }
          else if (e.key === "Home") { e.preventDefault(); go(0, "key"); }
          else if (e.key === "End") { e.preventDefault(); go(count - 1, "key"); }
        }}
      >
        <m.div
          className="dcar__drag"
          drag={reduced ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragSnapToOrigin
          dragDirectionLock
          onDragStart={() => (dragged.current = true)}
          onDragEnd={(_, info) => {
            const swipe = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 500;
            if (swipe) go(index + (info.offset.x < 0 ? 1 : -1), "drag");
            setTimeout(() => (dragged.current = false), 0);
          }}
        >
          {Array.from({ length: count }, (_, i) => i)
            .filter((i) => Math.abs(i - index) <= WINDOW)
            .map((i) => {
              const d = i - index;
              const p = pos(d);
              const active = d === 0;
              return (
                <m.div
                  key={i}
                  className="dcard"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={cardLabel(i)}
                  aria-hidden={!active}
                  inert={!active}
                  data-active={active}
                  style={{ width: dims.cw, marginLeft: -dims.cw / 2, zIndex: 10 - Math.abs(d) }}
                  initial={reduced ? false : { x: 0, scale: 0.9, opacity: 0, filter: "blur(0px)" }}
                  animate={{ x: p.x, scale: p.scale, opacity: p.opacity, rotateY: p.rot, filter: `blur(${p.blur}px)` }}
                  transition={reduced ? { duration: 0 } : { duration: 0.52, ease: [0.16, 1, 0.3, 1], delay: 0 }}
                  onClick={() => { if (!active && !dragged.current) go(i, "click"); }}
                >
                  {renderCard(i, { active, distance: d })}
                  <span className="dcard__veil" style={{ opacity: p.veil }} aria-hidden />
                </m.div>
              );
            })}
        </m.div>
      </div>

      <div className="dcar__controls">
        <button className="icon-btn" aria-label="Previous demo" disabled={index === 0} onClick={() => go(index - 1, "button")}><ChevronLeft /></button>
        <div className="dcar__dots" role="group" aria-label="Choose demo">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} className="dcar__dot" aria-label={cardLabel(i)} aria-current={i === index} data-on={i === index} onClick={() => go(i, "dot")}><i /></button>
          ))}
        </div>
        <button className="icon-btn" aria-label="Next demo" disabled={index === count - 1} onClick={() => go(index + 1, "button")}><ChevronRight /></button>
      </div>
      <p className="sr-only" aria-live="polite">{live}</p>
    </div>
  );
}
