"use client";
import { Activity, ArrowRight, ChartNoAxesCombined, CreditCard, Database, FileText, LayoutDashboard, ListChecks, RefreshCw, Server, ShieldCheck, Smartphone, Target, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { ButtonLink } from "@/components/ui/Button";

const stages: { id: string; n: string; title: string; sub: string; items: [LucideIcon, string][] }[] = [
  { id: "idea", n: "01", title: "Idea", sub: "Clear enough to build", items: [[Target, "User and problem"], [ListChecks, "Feature priorities"], [FileText, "Brief and scope"]] },
  { id: "mvp", n: "02", title: "MVP", sub: "Working and testable", items: [[Workflow, "Core flow"], [LayoutDashboard, "Interface"], [Database, "Auth and data"], [CreditCard, "Payments"], [ShieldCheck, "Admin"]] },
  { id: "prod", n: "03", title: "Production", sub: "Live and improving", items: [[Smartphone, "Responsive app"], [Server, "Deployment"], [Activity, "Monitoring"], [ChartNoAxesCombined, "Analytics"], [RefreshCw, "Iteration"]] },
];

export function Founders() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, "-15% 0px -15% 0px", true);
  const f = copy.founders;
  return (
    <section id="founders" className="section founders" aria-labelledby="founders-title">
      <div className="container founders__in">
        <div className="founders__copy">
          <p className="eyebrow">{f.eyebrow}</p>
          <h2 id="founders-title" className="h2">{f.titleA}<br />{f.titleB}</h2>
          <p className="body-l">{f.support}</p>
          <div className="founders__ctas">
            <ButtonLink href="/#start" onClick={() => { track("mvp_cta", { placement: "founders" }); presetBuilder("SaaS / MVP"); }}>{f.primary}</ButtonLink>
            <Link href="/#start" className="link-cta" onClick={() => { track("mvp_cta", { placement: "founders-prototype" }); presetBuilder("SaaS / MVP"); }}>{f.secondary}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
        <div className="founders__stairs" ref={ref} data-in={seen} aria-label="From idea to production">
          {stages.map((s, i) => (
            <div key={s.id} className="fstage" data-id={s.id} style={{ ["--s" as string]: i }}>
              <div className="fstage__h"><span className="mono">{s.n}</span><b>{s.title}</b><em>{s.sub}</em></div>
              <ul>
                {s.items.map(([I, t], k) => (
                  <li key={t} style={{ ["--k" as string]: k }}><I aria-hidden />{t}</li>
                ))}
              </ul>
              <u><i /></u>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
