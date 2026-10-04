"use client";
import { ArrowRight, BarChart3, Bot, Boxes, Building2, Plug, Rocket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { proofItems, type ProofId } from "@/content/proof";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { useScript } from "@/lib/useScript";
import { Reveal } from "@/components/ui/Reveal";
import { ChainDesk } from "./apps/ChainDesk";
import { ConnectHub } from "./apps/ConnectHub";
import { OpsBoard } from "./apps/OpsBoard";
import { LaunchKit } from "./apps/LaunchKit";
import { MarketDesk } from "./apps/MarketDesk";
import { SupportGrid } from "./apps/SupportGrid";

const APPS: Record<ProofId, (p: { step: number }) => React.JSX.Element> = { launchkit: LaunchKit, opsboard: OpsBoard, supportgrid: SupportGrid, connecthub: ConnectHub, chaindesk: ChainDesk, marketdesk: MarketDesk };
const ICONS: Record<ProofId, LucideIcon> = { launchkit: Rocket, opsboard: Building2, supportgrid: Bot, connecthub: Plug, chaindesk: Boxes, marketdesk: BarChart3 };

export function ProofSection({ children }: { children?: React.ReactNode }) {
  const { reduced } = useMotionPreference();
  const [active, setActive] = useState(0);
  const [replay, setReplay] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(stage, "-15% 0px -15% 0px");
  const near = useInView(stage, "900px 0px 900px 0px", true);
  const item = proofItems[active];
  const App = APPS[item.id];
  // Only the visible, selected product runs its one scripted interaction; it then rests.
  const step = useScript(item.steps, 850, inView, reduced, `${item.id}-${replay}`);

  const pick = (i: number, how: string) => { setActive(i); track("lab_opened", { product: proofItems[i].id, method: how }); };
  const onKey = (e: React.KeyboardEvent) => {
    const n = proofItems.length;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (active + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); pick(i, "key"); tabs.current[i]?.focus(); }
  };

  return (
    <section id="proof" className="section proof" aria-labelledby="proof-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.proof.eyebrow}</p>
          <h2 id="proof-title" className="h2">{copy.proof.title}</h2>
          <p className="body-l">{copy.proof.support}</p>
        </Reveal>
        <div className="proof__grid">
          <div className="proof__tabs" role="tablist" aria-orientation="vertical" aria-label="Capability proof" onKeyDown={onKey}>
            {proofItems.map((p, i) => {
              const Ic = ICONS[p.id];
              return (
                <button key={p.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`pf-${p.id}`} aria-selected={active === i} aria-controls="pf-panel" tabIndex={active === i ? 0 : -1} className="proof__tab" data-active={active === i} onClick={() => pick(i, "click")}>
                  <Ic aria-hidden /><span className="mono">{p.tab.toUpperCase()}</span><b>{p.name}</b>
                </button>
              );
            })}
          </div>
          <div id="pf-panel" role="tabpanel" aria-labelledby={`pf-${item.id}`} className="proof__main">
            <div className="proof__stage" ref={stage}>
              {near && <div className="proof__screen" key={item.id} aria-hidden><App step={step} /></div>}
              <p className="sr-only">{item.name}, {item.kind}. {item.text}</p>
            </div>
            <div className="proof__cap" key={"c" + item.id}>
              <div className="proof__capmain">
                <p className="mono mono--muted">{item.kind.toUpperCase()}</p>
                <h3>{item.name}</h3>
                <p className="body-l">{item.text}</p>
                <ul className="proof__tags" aria-label="Capabilities shown">{item.tags.map((t) => <li key={t} className="mono">{t}</li>)}</ul>
              </div>
              <div className="proof__side">
                <p className="proof__brief"><span className="mono">WHAT THE BUILD HAD TO SOLVE</span>{item.brief}</p>
                <div className="proof__ctas">
                  <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "proof", product: item.id }); goToBuilder(e, item.need); }}>{item.cta}<ArrowRight className="arrow" aria-hidden /></Link>
                </div>
              </div>
            </div>
            <p className="proof__meta mono mono--muted">BUILT BY STACKENDBOX</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
