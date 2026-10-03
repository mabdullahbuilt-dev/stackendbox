"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { primaryLabs, secondaryLabs, type Lab } from "@/content/labs";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { FitBox } from "@/components/ui/FitBox";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/StatusChip";
import { ConnectHub } from "@/components/proof/scenes/ConnectHub";
import { DealSignal } from "@/components/proof/scenes/DealSignal";
import { LaunchKit } from "@/components/proof/scenes/LaunchKit";
import { LeadOS } from "@/components/proof/scenes/LeadOS";
import { ListingReel } from "@/components/proof/scenes/ListingReel";
import { OpsBoard } from "@/components/proof/scenes/OpsBoard";
import { SupportGrid } from "@/components/proof/scenes/SupportGrid";
import { TablePilot } from "@/components/proof/scenes/TablePilot";

const SCENES = { leados: LeadOS, listingreel: ListingReel, dealsignal: DealSignal, supportgrid: SupportGrid, tablepilot: TablePilot, connecthub: ConnectHub, opsboard: OpsBoard, launchkit: LaunchKit } as const;
const all: Lab[] = [...primaryLabs, ...secondaryLabs];

export function Labs() {
  const { reduced } = useMotionPreference();
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, "-10% 0px -10% 0px");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const lab = all[active];
  const Scene = SCENES[lab.id];

  const open = (i: number, how: string) => { setActive(i); track("lab_opened", { lab: all[i].id, method: how }); };
  const onKey = (e: React.KeyboardEvent) => {
    const n = all.length;
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (active + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); open(i, "key"); tabs.current[i]?.focus(); }
  };
  const btn = (l: Lab, i: number, small?: boolean) => (
    <button key={l.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`lab-${l.id}`} aria-selected={active === i} aria-controls="labs-panel" tabIndex={active === i ? 0 : -1} className={small ? "labtab labtab--s" : "labtab"} data-active={active === i} onClick={() => open(i, "click")}>
      <span className="labtab__n mono">{small ? "" : String(i + 1).padStart(2, "0")}</span>
      <b>{l.name}</b>
      {!small && <em>{l.headline}</em>}
    </button>
  );

  return (
    <section id="labs" className="section section--alt labs" aria-labelledby="labs-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.labs.eyebrow}</p>
          <h2 id="labs-title" className="h2">{copy.labs.title}</h2>
          <p className="body-l">{copy.labs.support}</p>
        </Reveal>

        <div role="tablist" aria-label="StackEndBox Labs builds" className="labs__tabs" onKeyDown={onKey}>
          <div className="labs__primary" role="presentation">{primaryLabs.map((l, i) => btn(l, i))}</div>
          <div className="labs__more" role="presentation">
            <span className="mono mono--muted">{copy.labs.more}</span>
            {secondaryLabs.map((l, i) => btn(l, i + primaryLabs.length, true))}
          </div>
        </div>

        <div id="labs-panel" role="tabpanel" aria-labelledby={`lab-${lab.id}`}>
          <div className="labs__stage" ref={stage}>
            <div aria-hidden key={lab.id} className="labs__scene"><FitBox maxW={980}><Scene playing={inView && !reduced} reduced={reduced} /></FitBox></div>
            <p className="sr-only">{lab.sr}</p>
          </div>
          <div className="labs__cap" key={"c" + lab.id}>
            <div className="labs__capmain">
              <Chip mono>CAPABILITY BUILD</Chip>
              <h3 className="labs__h">{lab.headline}</h3>
              <p className="body-l">{lab.text}</p>
              <ul className="labs__tags" aria-label="Capabilities shown">{lab.tags.map((t) => <li key={t}><Chip>{t}</Chip></li>)}</ul>
            </div>
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "labs", lab: lab.id }); presetBuilder(lab.need); }}>{lab.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
