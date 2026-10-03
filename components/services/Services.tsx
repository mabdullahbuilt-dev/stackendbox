"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Boxes, Braces, ChartNoAxesCombined, LayoutDashboard, Layers, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { services, type Service } from "@/content/services";
import { track } from "@/lib/analytics";
import { presetBuilder } from "@/lib/intent";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { AiVisual, ApiVisual, AutomationVisual, CrmVisual, CustomVisual, SaasVisual, WebVisual } from "./visuals";

const icons: Record<Service["id"], LucideIcon> = { saas: Layers, web: LayoutDashboard, ai: Bot, automation: Workflow, crm: ChartNoAxesCombined, api: Braces, custom: Boxes };
const visuals: Record<Service["id"], (p: { play?: boolean }) => React.ReactNode> = { saas: SaasVisual, web: WebVisual, ai: AiVisual, automation: AutomationVisual, crm: CrmVisual, api: ApiVisual, custom: CustomVisual };

/** Plays once when first seen and again on hover or focus (never while already playing). Resting state is the finished scene. */
function ServiceCard({ s }: { s: Service }) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, "-15% 0px -15% 0px", true);
  // the scene is decorative: mount it just before it scrolls into view to keep first load light
  const near = useInView(ref, "700px 0px 700px 0px", true);
  const [run, setRun] = useState(0);
  const busy = useRef(false);
  const Icon = icons[s.id];
  const Visual = visuals[s.id];
  const play = () => {
    if (reduced || busy.current) return;
    busy.current = true;
    setRun((r) => r + 1);
    setTimeout(() => { busy.current = false; }, 3600);
  };
  useEffect(() => { if (seen) play(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  return (
    <article className="scard" data-id={s.id} data-run={run > 0} ref={ref} onPointerEnter={play} onFocus={play}>
      <div className="scard__vis" key={run} data-play={run > 0}>{near && <Visual play={run > 0} />}</div>
      <div className="scard__body">
        <span className="scard__ic"><Icon aria-hidden /></span>
        <h3 className="scard__t">{s.title}</h3>
        <p className="body-s">{s.text}</p>
        <Link href="/#start" className="link-cta" onClick={() => { track("service_selected", { service: s.id }); presetBuilder(s.need); }}>
          {s.cta}<ArrowRight className="arrow" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function Services() {
  return (
    <section id="services" className="section svc" aria-labelledby="services-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.services.eyebrow}</p>
          <h2 id="services-title" className="h2">{copy.services.title}</h2>
          <p className="body-l">{copy.services.support}</p>
        </Reveal>
        <div className="svc__grid">
          {services.map((s, i) => (
            <Reveal key={s.id} className={`svc__cell svc__cell--${s.id}`} delay={Math.min(i, 4) * 0.04}><ServiceCard s={s} /></Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
