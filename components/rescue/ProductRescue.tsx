"use client";
import { Activity, ArrowRight, Bug, CircleCheck, CircleX, FlaskConical, KeyRound, LayoutTemplate, Network, Rocket, Smartphone, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { ButtonLink } from "@/components/ui/Button";

const before: [LucideIcon, string][] = [
  [Wrench, "Prototype quality code"],
  [LayoutTemplate, "Fragile interface"],
  [KeyRound, "Missing authentication"],
  [Rocket, "Manual deployment"],
  [Bug, "Broken user flows"],
  [FlaskConical, "No tests"],
];
const after: [LucideIcon, string][] = [
  [Network, "Stable architecture"],
  [Smartphone, "Responsive interface"],
  [KeyRound, "Authentication"],
  [Network, "API layer"],
  [FlaskConical, "Automated testing"],
  [Rocket, "Repeatable deployment"],
  [Activity, "Monitoring"],
];

export function ProductRescue() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, "-20% 0px -20% 0px", true);
  const r = copy.rescue;
  return (
    <section id="rescue" className="section rescue" aria-labelledby="rescue-title">
      <div className="container">
        <div className="sec-head">
          <p className="eyebrow">{r.eyebrow}</p>
          <h2 id="rescue-title" className="h2">{r.titleA}<br />{r.titleB}</h2>
          <p className="body-l">{r.support}</p>
        </div>
        <div className="rescue__board" ref={ref} data-in={seen}>
          <div className="rescue__col rescue__col--b">
            <p className="mono mono--muted"><TriangleAlert aria-hidden /> BEFORE</p>
            <ul>{before.map(([I, t], i) => <li key={t} style={{ ["--k" as string]: i, ["--r" as string]: `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg` }}><I aria-hidden />{t}<CircleX className="rescue__x" aria-hidden /></li>)}</ul>
          </div>
          <div className="rescue__mid" aria-hidden><i /></div>
          <div className="rescue__col rescue__col--a">
            <p className="mono"><CircleCheck aria-hidden /> AFTER</p>
            <ul>{after.map(([I, t], i) => <li key={t} style={{ ["--k" as string]: i }}><I aria-hidden />{t}<CircleCheck className="rescue__ok" aria-hidden /></li>)}</ul>
          </div>
        </div>
        <div className="rescue__cta">
          <ButtonLink href="/#start" onClick={() => { track("cta_click", { placement: "rescue" }); presetBuilder("Custom Software", "Existing Product"); }}>{r.cta}</ButtonLink>
          <span className="body-s">{r.note}<ArrowRight className="sr-only" aria-hidden /></span>
        </div>
      </div>
    </section>
  );
}
