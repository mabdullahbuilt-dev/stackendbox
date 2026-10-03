"use client";
/**
 * Breadth rail: a low-motion marquee (36px/s, one direction, no scroll coupling).
 * Behaviour modelled on React Bits "Logo Loop" (https://reactbits.dev/animations/logo-loop):
 * duplicated track with aria-hidden copies, pause on hover, plus the guards the original lacks —
 * off-screen pause and reduced-motion (static chip cloud). Original CSS implementation.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { presetBuilder } from "@/lib/intent";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Breadth() {
  const { reduced } = useMotionPreference();
  const wrap = useRef<HTMLDivElement>(null);
  const track_ = useRef<HTMLUListElement>(null);
  const inView = useInView(wrap, "100px");
  const [dur, setDur] = useState(60);

  useEffect(() => {
    const el = track_.current;
    if (!el) return;
    const set = () => setDur(Math.max(20, el.scrollWidth / 2 / 36));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chips = copy.breadth.rail;
  return (
    <section id="breadth" className="breadth" aria-labelledby="breadth-title">
      <div className="container breadth__in">
        <Reveal className="breadth__head">
          <p className="eyebrow">{copy.breadth.eyebrow}</p>
          <h2 id="breadth-title" className="h-xxl">
            <span className="block">{copy.breadth.a}</span>
            <span className="block tone2">{copy.breadth.b}</span>
          </h2>
          <p className="body-l">{copy.breadth.support}</p>
          <ButtonLink href="/#start" size="lg" onClick={() => { track("capability_intent_cta_click", { capability: "custom", placement: "breadth" }); presetBuilder("Something else"); }}>
            {copy.breadth.cta}
          </ButtonLink>
        </Reveal>
      </div>

      <div ref={wrap} className="rail" data-static={reduced} aria-label="Examples of what StackEndBox builds" role="list">
        <ul ref={track_} className="rail__track" style={{ animationDuration: `${dur}s`, animationPlayState: inView && !reduced ? "running" : "paused" }}>
          {[...chips, ...(reduced ? [] : chips)].map((c, i) => (
            <li key={`${c}-${i}`} role={i < chips.length ? "listitem" : "presentation"} aria-hidden={i >= chips.length} className="rail__chip mono" data-mid={c === "Web3" || c === "Market Tools"}>{c}</li>
          ))}
        </ul>
      </div>
      <Link href="/#start" className="sr-only">Describe your problem</Link>
    </section>
  );
}
