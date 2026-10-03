"use client";
import { ArrowRight, Check, RotateCcw, Workflow } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { systems } from "@/content/integrations";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Reveal } from "@/components/ui/Reveal";

const N = systems.length;
const pt = (i: number, r: number) => {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
};

export function Integrations() {
  const { reduced } = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, "-20% 0px -20% 0px");
  const [docked, setDocked] = useState(true);
  const [run, setRun] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const played = useRef(false);

  useEffect(() => {
    if (reduced) return;
    if (!played.current) setDocked(false);
  }, [reduced]);
  useEffect(() => {
    if (reduced || !inView || played.current) return;
    played.current = true;
    const t = setTimeout(() => { setDocked(true); track("scene_complete", { scene: "integrations" }); }, 500);
    return () => clearTimeout(t);
  }, [inView, reduced]);

  const replay = () => {
    played.current = true;
    setDocked(false);
    setRun((r) => r + 1);
    track("scene_replay", { scene: "integrations" });
    setTimeout(() => setDocked(true), 600);
  };
  const pick = (i: number) => { setSel(i); track("integration_selected", { system: systems[i].key }); };

  return (
    <section id="integrations" className="section ix-sec" aria-labelledby="int-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.integrations.eyebrow}</p>
          <h2 id="int-title" className="h2">{copy.integrations.title}</h2>
          <p className="body-l">{copy.integrations.support}</p>
        </Reveal>

        <div className="ixw" ref={root}>
          <div className="ixw__stage" data-docked={docked} key={run}>
            <div className="ixw__hub" aria-hidden><Workflow /><span>Your system</span></div>
            {systems.map((s, i) => {
              const o = pt(i, 41);
              const n = pt(i, 28);
              return (
                <button
                  key={s.key}
                  type="button"
                  className="ixw__node"
                  data-sel={sel === i}
                  aria-label={`${s.label}: ${s.action}`}
                  aria-pressed={sel === i}
                  style={{ ["--i" as string]: i, ["--ox" as string]: o.x, ["--oy" as string]: o.y, ["--nx" as string]: n.x, ["--ny" as string]: n.y }}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setSel(i); }}
                  onFocus={() => pick(i)}
                  onClick={() => pick(i)}
                >
                  <BrandIcon name={s.key} size={26} />
                  <span className="ixw__tip">{s.action}</span>
                  <i className="ixw__pulse" aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="ixw__side">
            <p className="mono mono--muted">{copy.integrations.label.toUpperCase()}</p>
            <ul className="ixw__events" aria-label="Example automated events">
              {copy.integrations.events.map((e, i) => (
                <li key={e} data-on={docked} style={{ ["--i" as string]: i }}><Check aria-hidden /><span>{e}</span></li>
              ))}
            </ul>
            <p className="ixw__live" aria-live="polite">{sel !== null ? <><b>{systems[sel].label}</b>{systems[sel].action}</> : "Select a system to see an example action."}</p>
            <div className="ixw__foot">
              <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "integrations" }); presetBuilder("API / Integration"); }}>{copy.integrations.cta}<ArrowRight className="arrow" aria-hidden /></Link>
              {!reduced && <button type="button" className="chip chip--mono ix-replay" onClick={replay}><RotateCcw aria-hidden /> Replay</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
