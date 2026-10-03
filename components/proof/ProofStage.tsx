"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { demos } from "@/content/demos";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { intentCta, intentDemo, presetBuilder, readIntent, type Capability } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/StatusChip";
import { FitBox } from "@/components/ui/FitBox";
import { DepthCarousel } from "./DepthCarousel";
import { LeadOS } from "./scenes/LeadOS";
import { TablePilot } from "./scenes/TablePilot";
import { ConnectHub } from "./scenes/ConnectHub";
import { SupportGrid } from "./scenes/SupportGrid";
import { OpsBoard } from "./scenes/OpsBoard";
import { LaunchKit } from "./scenes/LaunchKit";

const SCENES = { leados: LeadOS, tablepilot: TablePilot, connecthub: ConnectHub, supportgrid: SupportGrid, opsboard: OpsBoard, launchkit: LaunchKit } as const;

export function ProofStage() {
  const { reduced } = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, "0px");
  const [index, setIndex] = useState(0);
  const [intent, setIntent] = useState<Capability | null>(null);
  const viewTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const i = readIntent();
    if (i) {
      setIntent(i);
      const k = demos.findIndex((d) => d.id === intentDemo[i]);
      if (k >= 0) setIndex(k);
    }
  }, []);

  // proof_card_view: active ≥ 2s
  useEffect(() => {
    window.clearTimeout(viewTimer.current);
    viewTimer.current = window.setTimeout(() => track("proof_card_view", { demo: demos[index].id }), 2000);
    return () => window.clearTimeout(viewTimer.current);
  }, [index]);

  const onIndex = useCallback((i: number, method: string) => {
    setIndex(i);
    track("proof_interaction", { demo: demos[i].id, method });
  }, []);

  const d = demos[index];
  const ctaLabel = intent ? `${intentCta[intent]} →` : copy.proof.cta;

  return (
    <section id="proof" className="section proof" aria-labelledby="proof-title">
      <div className="container">
        <Reveal className="sec-head proof__head">
          <div>
            <p className="eyebrow">{copy.proof.eyebrow}</p>
            <h2 id="proof-title" className="h2">{copy.proof.titleA}</h2>
          </div>
          <div className="proof__side">
            <p className="body-l">{copy.proof.support}</p>
            <p className="mono mono--muted proof__count tnum" aria-hidden>{String(index + 1).padStart(2, "0")} / {String(demos.length).padStart(2, "0")}</p>
          </div>
        </Reveal>
      </div>

      <div ref={root}>
        <DepthCarousel
          count={demos.length}
          index={index}
          onIndex={onIndex}
          label="Demo systems"
          cardLabel={(i) => `${demos[i].name}, ${i + 1} of ${demos.length}`}
          announce={`Demo ${index + 1} of ${demos.length}: ${d.name}`}
          renderCard={(i, { active }) => {
            const Scene = SCENES[demos[i].id];
            return (
              <FitBox>
                <Scene playing={active && inView && !reduced} reduced={reduced} />
              </FitBox>
            );
          }}
        />
      </div>

      <div className="container">
        <div className="proof__caption">
          <div className="proof__cap-main" key={d.id}>
            <div className="proof__cap-row">
              <h3 className="h3">{d.name}</h3>
              <Chip mono>DEMO SYSTEM</Chip>
              <Chip mono>SAMPLE DATA</Chip>
            </div>
            <p className="body-l">{d.line}</p>
            <ul className="proof__tags" aria-label="Capabilities shown">
              {d.tags.map((t) => <li key={t}><Chip>{t}</Chip></li>)}
            </ul>
            <p className="sr-only">{d.sr}</p>
          </div>
          <div className="proof__cap-cta">
            <Link
              href="/#start"
              className="link-cta"
              onClick={() => { track("capability_intent_cta_click", { capability: d.cap, placement: "proof" }); presetBuilder(d.need); }}
            >
              {ctaLabel}
            </Link>
            <span className="mono mono--muted hide-sm">{copy.proof.hint}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
