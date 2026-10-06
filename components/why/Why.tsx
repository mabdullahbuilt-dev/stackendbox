"use client";
import { Check, Layers, MonitorPlay, Plug, ShieldCheck, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { useMotionPreference } from "@/lib/useMotionPreference";

const POINTS: { icon: LucideIcon; stop: string; title: string; text: string }[] = [
  { icon: Layers, stop: "BRIEF", title: "One team across the build.", text: "Product, interface, backend, AI and integrations are designed together, not handed between vendors." },
  { icon: MonitorPlay, stop: "PRODUCT", title: "Working progress you can see.", text: "You review real software as it takes shape, not only documents and mockups." },
  { icon: Plug, stop: "SYSTEMS", title: "Built around the real operation.", text: "We work with the tools, data and workflows your team already uses." },
  { icon: ShieldCheck, stop: "PRODUCTION", title: "Production considered from the start.", text: "Responsive behavior, edge cases, integrations and deployment are part of the build." },
];

/** The one light section: a continuous delivery path. Current stop is orange, completed stops are green. */
export function Why() {
  const { reduced } = useMotionPreference();
  // The project object travels the path with scroll, and back again when scrolling up.
  const raw = useChapterStep("delivery", POINTS.length + 1);
  const step = reduced ? POINTS.length : raw;
  const ref = useRef<HTMLOListElement>(null);
  return (
    <section id="delivery" className="why" aria-labelledby="why-title">
      <div className="container">
        <div className="sec-head">
          <p className="eyebrow">{copy.why.eyebrow}</p>
          <h2 id="why-title" className="h2">{copy.why.title}</h2>
        </div>
        <ol className="why__path" ref={ref} style={{ ["--p" as string]: Math.min(step, POINTS.length) }}>
          <span className="why__obj" aria-hidden><b className="mono">{POINTS[Math.min(Math.max(step - 1, 0), POINTS.length - 1)].stop}</b><i /><i /></span>
          {POINTS.map((p, i) => {
            const st = step > i ? "done" : step === i ? "active" : "idle";
            const Ic = p.icon;
            return (
              <li key={p.title} data-st={st}>
                <span className="why__stop mono">{p.stop}</span><span className="why__node">{st === "done" ? <Check aria-label="done" /> : <Ic aria-hidden />}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
