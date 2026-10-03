"use client";
import { ArrowRight, Bot, Boxes, Braces, ChartNoAxesCombined, LayoutDashboard, Layers, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { services, type Service } from "@/content/services";
import { track } from "@/lib/analytics";
import { presetBuilder } from "@/lib/intent";
import { Reveal } from "@/components/ui/Reveal";
import { AiVisual, ApiVisual, AutomationVisual, CrmVisual, CustomVisual, SaasVisual, WebVisual } from "./visuals";

const icons: Record<Service["id"], LucideIcon> = { saas: Layers, web: LayoutDashboard, ai: Bot, automation: Workflow, crm: ChartNoAxesCombined, api: Braces, custom: Boxes };
const visuals: Record<Service["id"], React.ReactNode> = { saas: <SaasVisual />, web: <WebVisual />, ai: <AiVisual />, automation: <AutomationVisual />, crm: <CrmVisual />, api: <ApiVisual />, custom: <CustomVisual /> };

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
          {services.map((s, i) => {
            const Icon = icons[s.id];
            return (
              <Reveal key={s.id} className={`svc__cell svc__cell--${s.id}`} delay={Math.min(i, 4) * 0.04}>
                <article className="scard" data-id={s.id}>
                  <div className="scard__vis">{visuals[s.id]}</div>
                  <div className="scard__body">
                    <span className="scard__ic"><Icon aria-hidden /></span>
                    <h3 className="scard__t">{s.title}</h3>
                    <p className="body-s">{s.text}</p>
                    <Link href="/#start" className="link-cta" onClick={() => { track("service_selected", { service: s.id }); presetBuilder(s.need); }}>
                      {s.cta}<ArrowRight className="arrow" aria-hidden />
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
