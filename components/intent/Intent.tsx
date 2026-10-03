"use client";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { intents } from "@/content/intents";
import { track } from "@/lib/analytics";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { AiViz, AutoViz, ConnectViz, CrmViz, CustomViz, MvpViz, SaasViz } from "./visuals";

function OtherViz({ href, onClick }: { href: string; onClick: () => void }) {
  return (
    <div className="iv iv-other">
      <div className="iv-input" style={{ ["--i" as string]: 0 }}>
        <span className="mono">DESCRIBE THE PROBLEM</span>
        <p>A half built booking tool that nobody can finish, plus a spreadsheet our team still updates by hand<i className="mk-caret" /></p>
      </div>
      <div className="iv-chips">{["Odd requirement", "Half built prototype", "Manual process", "Old system"].map((c, i) => <span key={c} style={{ ["--i" as string]: i + 1 }}>{c}</span>)}</div>
      <Link href={href} className="btn btn--primary btn--lg" onClick={onClick}>Scope This With Us<ArrowRight className="arrow" aria-hidden /></Link>
    </div>
  );
}

export function Intent() {
  const { reduced } = useMotionPreference();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const it = intents[active];

  const select = (i: number, how: string) => {
    setActive(i);
    track("intent_selected", { intent: intents[i].id, method: how });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = intents.length;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (active + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); select(i, "key"); tabs.current[i]?.focus(); }
  };
  const cta = () => { track("cta_click", { placement: "intent", intent: it.id }); presetBuilder(it.need); };

  const viz = {
    saas: <SaasViz />, mvp: <MvpViz />, ai: <AiViz />, automate: <AutoViz />, crm: <CrmViz />, connect: <ConnectViz />, custom: <CustomViz />,
    other: <OtherViz href="/#start" onClick={cta} />,
  }[it.id];

  return (
    <section id="intent" className="section section--alt intent" aria-labelledby="intent-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.intent.eyebrow}</p>
          <h2 id="intent-title" className="h2">{copy.intent.title}</h2>
          <p className="body-l">{copy.intent.support}</p>
        </Reveal>

        <div className="intent__grid">
          <div className="intent__left">
            <div className="intent__tabs" role="tablist" aria-orientation="vertical" aria-label="Outcomes" onKeyDown={onKey}>
              {intents.map((o, i) => (
                <button key={o.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`it-${o.id}`} aria-selected={active === i} aria-controls="intent-panel" tabIndex={active === i ? 0 : -1} className="itab" data-active={active === i} onClick={() => select(i, "click")}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="intent__copy" aria-live="polite" key={it.id}>
              <h3 className="intent__h">{it.headline}</h3>
              <p className="body-l">{it.text}</p>
              {it.id !== "other" && (
                <Link href="/#start" className="btn btn--primary" onClick={cta}>{it.cta}<ArrowRight className="arrow" aria-hidden /></Link>
              )}
            </div>
          </div>

          <div id="intent-panel" role="tabpanel" aria-labelledby={`it-${it.id}`} className="intent__stage">
            <p className="sr-only">{it.headline} {it.text}</p>
            <div aria-hidden className="intent__viz">
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={it.id} initial={reduced ? false : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }} className="intent__vizin">
                  {viz}
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
