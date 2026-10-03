"use client";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { FINE_POINTER } from "@/lib/hooks";
import { StatusChip } from "@/components/ui/StatusChip";
import { getSlots, type Chip, type SlotContent, type StateId } from "./states";

const SLOT_ORDER = ["s2", "s3", "s4", "s5", "s6", "s7"] as const;

function VerifyChip({ chip }: { chip: Chip }) {
  const { reduced } = useMotionPreference();
  const [tone, setTone] = useState(chip.verify && !reduced ? "amber" : chip.tone);
  useEffect(() => {
    if (!chip.verify || reduced) return;
    const t = setTimeout(() => setTone(chip.tone), 600);
    return () => clearTimeout(t);
  }, [chip, reduced]);
  return (
    <span className="mk-chip" data-dashed={chip.dashed}>
      <StatusChip tone={tone as never}>{chip.text}</StatusChip>
    </span>
  );
}

/** Steps 0..3 advance once after entering a state (idle micro-motion ≤ 1 loop). */
function useStep(key: string, reduced: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) {
      setStep(3);
      return;
    }
    setStep(0);
    const ts = [500, 1000, 1600].map((d, i) => setTimeout(() => setStep(i + 1), d));
    return () => ts.forEach(clearTimeout);
  }, [key, reduced]);
  return step;
}

export function Stage({ state, focusInput }: { state: StateId; focusInput?: boolean }) {
  const { reduced } = useMotionPreference();
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const step = useStep(state + String(focusInput), reduced);
  const slots = getSlots(state, { step, reduced, focusInput });

  // Fit the fixed design-space stage to its container.
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => o.style.setProperty("--s", String(o.clientWidth / i.offsetWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, []);

  // Pointer parallax for supporting layers (fine pointers only).
  useEffect(() => {
    const o = outer.current;
    if (!o || reduced || !window.matchMedia(FINE_POINTER).matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = o.getBoundingClientRect();
        o.style.setProperty("--px", String(((e.clientX - r.left) / r.width) * 2 - 1));
        o.style.setProperty("--py", String(((e.clientY - r.top) / r.height) * 2 - 1));
      });
    };
    const leave = () => { o.style.setProperty("--px", "0"); o.style.setProperty("--py", "0"); };
    o.addEventListener("pointermove", move);
    o.addEventListener("pointerleave", leave);
    return () => { o.removeEventListener("pointermove", move); o.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [reduced]);

  const dock = (i: number) => reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30, delay: 0.1 + i * 0.04 };
  const render = (key: (typeof SLOT_ORDER)[number] | "s1", i: number, content: SlotContent) => (
    <AnimatePresence key={key} mode="popLayout" initial={false}>
      {content && (
        <m.div
          key={state + key + String(focusInput)}
          className={`slot slot--${key}`}
          initial={reduced ? false : { opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: reduced ? 0 : 0.14 } }}
          transition={dock(i)}
        >
          <div className="slot__in">{content.node}</div>
          <span className="slot__cap mono">{content.caption}</span>
        </m.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="xstage" ref={outer}>
      <div className="xstage__design stage-grid" ref={inner}>
        <span className="mono mono--muted xstage__sample">SAMPLE DATA · CAPABILITY BUILD</span>
        {render("s1", 0, slots.s1)}
        {render("s2", 1, slots.s2)}
        {render("s3", 2, slots.s3)}
        {render("s4", 3, slots.s4)}
        {render("s7", 6, slots.s7)}
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div key={state + "c5"} className="slot slot--s5" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={dock(4)}><VerifyChip chip={slots.s5} /></m.div>
        </AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div key={state + "c6"} className="slot slot--s6" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={dock(5)}><VerifyChip chip={slots.s6} /></m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
