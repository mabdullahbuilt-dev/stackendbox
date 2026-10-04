"use client";
import { ArrowRight, Bot, Boxes, Lightbulb, Link2Off, Rocket, Sparkles, SquareStack, Wrench, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { starts, type StartId } from "@/content/starts";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import { Reveal } from "@/components/ui/Reveal";
import { startScenes } from "./scenes";

const icons: Record<StartId, LucideIcon> = { idea: Lightbulb, mvp: Rocket, prototype: SquareStack, existing: Wrench, manual: Workflow, systems: Link2Off, ai: Bot, custom: Boxes };

export function StartingPoint() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const s = starts[active];
  const Scene = startScenes[s.id];

  const select = (i: number, how: string) => { setActive(i); track("intent_selected", { start: starts[i].id, method: how }); };
  const onKey = (e: React.KeyboardEvent) => {
    const n = starts.length;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (active + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); select(i, "key"); tabs.current[i]?.focus(); }
  };

  return (
    <section id="intent" className="section section--alt intent startpt" aria-labelledby="start-pt-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.start.eyebrow}</p>
          <h2 id="start-pt-title" className="h2">{copy.start.title}</h2>
        </Reveal>
        <div className="intent__grid">
          <div className="intent__left">
            <div className="intent__tabs" role="tablist" aria-orientation="vertical" aria-label="Where you are starting from" onKeyDown={onKey}>
              {starts.map((o, i) => {
                const Ic = icons[o.id];
                return (
                  <button key={o.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`sp-${o.id}`} aria-selected={active === i} aria-controls="sp-panel" tabIndex={active === i ? 0 : -1} className="itab" data-active={active === i} onClick={() => select(i, "click")}>
                    <Ic aria-hidden />{o.label}
                  </button>
                );
              })}
            </div>
            <div className="intent__copy" aria-live="polite" key={s.id}>
              <h3 className="intent__h">{s.headline}</h3>
              <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "start", start: s.id }); goToBuilder(e, s.need, s.stage); }}>{s.cta}<ArrowRight className="arrow" aria-hidden /></Link>
            </div>
          </div>
          <div id="sp-panel" role="tabpanel" aria-labelledby={`sp-${s.id}`} className="intent__stage">
            <div aria-hidden key={s.id} className="sp-wrap"><Scene /></div>
            <p className="sr-only">{s.label}. {s.headline}</p>
          </div>
        </div>
        <Sparkles className="sr-only" aria-hidden />
      </div>
    </section>
  );
}
