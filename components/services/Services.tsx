"use client";
import { useEffect, useRef } from "react";
import { ArrowRight, Bot, Blocks, Boxes, Braces, ChartCandlestick, ChartNoAxesCombined, LayoutDashboard, Layers, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { services, type Service } from "@/content/services";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { TOTAL, visuals } from "./visuals";
import { useCardMachine } from "./useCardMachine";

const icons: Record<Service["id"], LucideIcon> = { saas: Layers, web: LayoutDashboard, custom: Boxes, ai: Bot, automation: Workflow, crm: ChartNoAxesCombined, api: Braces, web3: Blocks, trading: ChartCandlestick };

/**
 * Plays once when the card is visible, replays a short version on mouse hover or keyboard focus, and always
 * ends on the finished scene. The card container never moves; depth lives inside the scene.
 */
function ServiceCard({ s }: { s: Service }) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLElement>(null);
  const near = useInView(ref, "700px 0px 700px 0px", true);
  const live = useInView(ref, "-12% 0px -12% 0px");
  const played = useRef(false);
  const m = useCardMachine(TOTAL[s.id], reduced);
  const { run, park } = m;
  const Icon = icons[s.id];
  const Visual = visuals[s.id];

  useEffect(() => {
    if (!near) return;
    if (live && !played.current) { played.current = true; run("full"); }
    else if (!live) park();
  }, [live, near, run, park]);

  const hoverIn = (e: React.PointerEvent) => { if (e.pointerType === "mouse" && !m.busy) run("short"); };
  return (
    <article
      className="scard" data-id={s.id} data-phase={m.phase} ref={ref}
      onPointerEnter={hoverIn} onPointerLeave={m.finish}
      onFocus={(e) => { if (e.target.matches(":focus-visible") && !m.busy) run("short"); }} onBlur={m.finish}
    >
      <div className="scard__vis" aria-hidden>{near && <Visual n={m.n} />}</div>
      <div className="scard__body">
        <div className="scard__head"><span className="scard__ic"><Icon aria-hidden /></span><span className="mono scard__n">{s.n}</span></div>
        <h3 className="scard__t">{s.title}</h3>
        <p className="body-s">{s.text}</p>
        <Link href="/#start" className="link-cta" onClick={(e) => { track("service_selected", { service: s.id }); goToBuilder(e, s.need, undefined, `service-${s.id}`); }}>
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
          {services.map((s) => (
            <div key={s.id} className={`svc__cell svc__cell--${s.id}`}><ServiceCard s={s} /></div>
          ))}
        </div>
      </div>
    </section>
  );
}
