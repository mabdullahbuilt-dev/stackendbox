"use client";
import { AnimatePresence, m } from "motion/react";
import { ChevronRight, PackageCheck, PenTool, ShieldCheck, Target, Blocks, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { steps } from "@/content/process";
import { useMedia } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { processVisuals } from "./visuals";

const icons: Record<string, LucideIcon> = { discover: Target, design: PenTool, build: Blocks, verify: ShieldCheck, ship: PackageCheck };

export function Process() {
  const { reduced } = useMotionPreference();
  const wide = useMedia("(min-width: 768px)", true);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = steps[active];

  const head = (
    <div className="proc__head">
      <p className="eyebrow">{copy.process.eyebrow}</p>
      <h2 id="process-title" className="h2">{copy.process.title}</h2>
      <p className="body-l">{copy.process.support}</p>
    </div>
  );

  if (!wide) {
    return (
      <section id="process" className="section proc" aria-labelledby="process-title">
        <div className="container">
          <div className="sec-head">{head}</div>
          <div className="pacc">
            {steps.map((s, i) => {
              const Icon = icons[s.id];
              return (
                <div key={s.id} className="pacc__item" data-open={open === i}>
                  <h3>
                    <button aria-expanded={open === i} aria-controls={`pacc-${s.id}`} id={`pacc-h-${s.id}`} onClick={() => setOpen(open === i ? -1 : i)}>
                      <span className="pacc__ic"><Icon aria-hidden /></span>
                      <span className="proc__word proc__word--m"><small className="mono">{s.n}</small>{s.word}</span>
                      <ChevronRight aria-hidden />
                    </button>
                  </h3>
                  <div id={`pacc-${s.id}`} role="region" aria-labelledby={`pacc-h-${s.id}`} hidden={open !== i}>
                    <p className="body-l">{s.line}</p>
                    <div className="pstage pstage--m">{open === i && processVisuals[s.id]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const onKey = (e: React.KeyboardEvent) => {
    const n = steps.length;
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (active + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); setActive(i); tabs.current[i]?.focus(); }
  };

  return (
    <section id="process" className="section proc" aria-labelledby="process-title">
      <div className="container">
        <Reveal className="sec-head">{head}</Reveal>
        <div className="pflow" role="tablist" aria-label="Steps" onKeyDown={onKey}>
          <div className="pflow__rail" aria-hidden><i style={{ width: `${(active / (steps.length - 1)) * 100}%` }} /></div>
          {steps.map((s, i) => {
            const Icon = icons[s.id];
            return (
              <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`pt-${s.id}`} aria-selected={active === i} aria-controls="proc-panel" tabIndex={active === i ? 0 : -1} className="pstep" data-active={active === i} data-done={i < active} onClick={() => setActive(i)}>
                <span className="pstep__ic"><Icon aria-hidden /></span>
                <span className="mono pstep__n">{s.n}</span>
                <b>{s.word}</b>
              </button>
            );
          })}
        </div>
        <div id="proc-panel" role="tabpanel" aria-labelledby={`pt-${cur.id}`} className="proc__panel">
          <div className="proc__txt" key={cur.id}>
            <h3 className="proc__big">{cur.word}</h3>
            <p className="body-l">{cur.line}</p>
          </div>
          <div className="pstage" aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={cur.id} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}>
                {processVisuals[cur.id]}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
