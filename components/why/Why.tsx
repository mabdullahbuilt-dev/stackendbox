"use client";
import { Check, Layers, MonitorPlay, Plug, ShieldCheck, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { useMotionPreference } from "@/lib/useMotionPreference";

const POINTS: { icon: LucideIcon; stop: string; title: string; text: string }[] = [
  { icon: Layers, stop: "BRIEF", title: "One engineering partner, problem to production", text: "The same team scopes the problem, designs the product and ships it. No hand-offs between an agency, freelancers and an internal team, and no context lost between them." },
  { icon: Plug, stop: "PRODUCT", title: "Every layer designed together", text: "Product, interface, backend, data, AI and integrations are decided together, so they fit from the start instead of being patched together later." },
  { icon: MonitorPlay, stop: "SYSTEMS", title: "Working software you can review", text: "You review real flows running on the real data model as the build takes shape, not slide decks and static mockups." },
  { icon: ShieldCheck, stop: "PRODUCTION", title: "Built for your operation and for production", text: "Roles, permissions, failure states, responsive layouts and deployment are designed in from day one, around the way your team actually works." },
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
          <p className="body-l">{copy.why.support}</p>
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
