"use client";
import { Check, Layers, MonitorPlay, Plug, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Layers, title: "One team, end to end", text: "Product, interface, backend, AI and integrations designed together." },
  { icon: MonitorPlay, title: "Working software early", text: "You review real progress, not just documents and mockups." },
  { icon: Plug, title: "Built around your systems", text: "We work with the tools, data and workflows you already use." },
  { icon: ShieldCheck, title: "Ready for the real world", text: "Responsive behavior, edge cases, integrations and deployment are part of the build." },
];

/** The one light section: a continuous delivery path. Current stop is orange, completed stops are green. */
export function Why() {
  const { reduced } = useMotionPreference();
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, "-20% 0px -20% 0px", true);
  useEffect(() => {
    if (reduced) { setStep(POINTS.length); return; }
    if (!inView) return;
    let k = 0;
    setStep(0);
    const id = setInterval(() => { k += 1; setStep(k); if (k >= POINTS.length) clearInterval(id); }, 750);
    return () => clearInterval(id);
  }, [inView, reduced]);
  return (
    <section id="delivery" className="why" aria-labelledby="why-title">
      <div className="container">
        <div className="sec-head">
          <p className="eyebrow">{copy.why.eyebrow}</p>
          <h2 id="why-title" className="h2">{copy.why.title}</h2>
        </div>
        <ol className="why__path" ref={ref} style={{ ["--p" as string]: Math.min(step, POINTS.length) }}>
          {POINTS.map((p, i) => {
            const st = step > i ? "done" : step === i ? "active" : "idle";
            const Ic = p.icon;
            return (
              <li key={p.title} data-st={st}>
                <span className="why__node">{st === "done" ? <Check aria-label="done" /> : <Ic aria-hidden />}</span>
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
