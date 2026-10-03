"use client";
import { AnimatePresence, m } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { useMedia } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { processVisuals } from "./visuals";

const STAGES = [
  { id: "discover", word: "DISCOVER", line: "We pin down the problem, the users and what “done” means." },
  { id: "design", word: "DESIGN", line: "Architecture and interface planned together, so neither fights the other." },
  { id: "build", word: "BUILD", line: "Working increments you can open, click and challenge." },
  { id: "verify", word: "VERIFY", line: "Tests, edge cases and failure states checked before anyone relies on it." },
  { id: "ship", word: "SHIP", line: "Deployed and monitored, with the build explained to your team." },
] as const;

export function Process() {
  const { reduced } = useMotionPreference();
  const desktop = useMedia("(min-width: 1024px)", true);
  const wide = useMedia("(min-width: 768px)", true);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const lastUser = useRef(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setMounted(true), []);

  const choose = useCallback((i: number) => { lastUser.current = Date.now(); setActive(i); }, []);

  // scroll → index (native sticky; no pin)
  useEffect(() => {
    if (!mounted || !desktop || reduced || !track.current) return;
    const el = track.current;
    let raf = 0;
    const calc = () => {
      raf = 0;
      if (Date.now() - lastUser.current < 1500) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return;
      const p = Math.min(0.999, Math.max(0, -r.top / span));
      setActive(Math.floor(p * STAGES.length));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(calc); };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    calc();
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [mounted, desktop, reduced]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = STAGES.length;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (active + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); choose(i); tabs.current[i]?.focus(); }
  };

  const head = (
    <div className="proc__head">
      <p className="eyebrow">{copy.process.eyebrow}</p>
      <h2 id="process-title" className="h2">{copy.process.title}</h2>
      <p className="body-l">{copy.process.support}</p>
    </div>
  );

  // Reduced motion: all stages stacked as a simple list.
  if (mounted && reduced) {
    return (
      <section id="process" className="section proc" aria-labelledby="process-title">
        <div className="container">
          <Reveal className="sec-head">{head}</Reveal>
          <ol className="proc__static">
            {STAGES.map((s) => (
              <li key={s.id}><h3 className="proc__word proc__word--s">{s.word}</h3><p className="body-l">{s.line}</p><div className="pstage">{processVisuals[s.id]}</div></li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  // Mobile accordion
  if (mounted && !wide) {
    return (
      <section id="process" className="section proc" aria-labelledby="process-title">
        <div className="container">
          <div className="sec-head">{head}</div>
          <div className="pacc">
            {STAGES.map((s, i) => (
              <div key={s.id} className="pacc__item" data-open={open === i}>
                <h3>
                  <button aria-expanded={open === i} aria-controls={`pacc-${s.id}`} id={`pacc-h-${s.id}`} onClick={() => setOpen(open === i ? -1 : i)}>
                    <span className="proc__word proc__word--m">{s.word}</span><ChevronRight aria-hidden />
                  </button>
                </h3>
                <div id={`pacc-${s.id}`} role="region" aria-labelledby={`pacc-h-${s.id}`} hidden={open !== i}>
                  <p className="body-l">{s.line}</p>
                  <div className="pstage pstage--m">{open === i && processVisuals[s.id]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const cur = STAGES[active];
  return (
    <section id="process" className="proc proc--desk" aria-labelledby="process-title">
      <div className="proc__track" ref={track} data-sticky={desktop}>
        <div className="proc__sticky">
          <div className="container proc__grid">
            <div className="proc__left">
              {head}
              <div role="tablist" aria-orientation="vertical" aria-label="Stages" className="proc__words" onKeyDown={onKey}>
                {STAGES.map((s, i) => (
                  <button
                    key={s.id}
                    ref={(el) => { tabs.current[i] = el; }}
                    role="tab" id={`pt-${s.id}`} aria-selected={active === i} aria-controls="proc-panel" tabIndex={active === i ? 0 : -1}
                    className="proc__tab" data-active={active === i}
                    onClick={() => choose(i)} onPointerEnter={(e) => { if (e.pointerType === "mouse") choose(i); }}
                  >
                    <span className="proc__word">{s.word}</span>
                    <span className="proc__line">{s.line}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="proc__right">
              <div id="proc-panel" role="tabpanel" aria-labelledby={`pt-${cur.id}`} className="pstage">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div key={cur.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} aria-hidden>
                    {processVisuals[cur.id]}
                  </m.div>
                </AnimatePresence>
                <span className="mono mono--muted pstage__n tnum" aria-hidden>{String(active + 1).padStart(2, "0")} / 05</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
