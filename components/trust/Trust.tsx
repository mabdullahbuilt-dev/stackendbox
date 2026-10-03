import { CircleCheck, FlaskConical, Map, Plug, Server, Smartphone, type LucideIcon } from "lucide-react";
import { copy } from "@/content/copy";
import { Reveal } from "@/components/ui/Reveal";
import { SpotlightCard } from "@/components/vendor/SpotlightCard";

const cards: { id: string; icon: LucideIcon; title: string; text: string }[] = [
  { id: "scope", icon: Map, title: "Clear scope", text: "We map the system before the build starts." },
  { id: "progress", icon: CircleCheck, title: "Working progress", text: "You see functional progress during development." },
  { id: "responsive", icon: Smartphone, title: "Responsive by default", text: "Desktop, tablet and mobile are planned together." },
  { id: "integ", icon: Plug, title: "Integrations included", text: "We account for the external systems the product depends on." },
  { id: "verify", icon: FlaskConical, title: "Verification", text: "Critical workflows and edge cases are tested before release." },
  { id: "deploy", icon: Server, title: "Deployment support", text: "We help move the build into a live environment." },
];

export function Trust() {
  return (
    <section id="delivery" className="section section--alt trust" aria-labelledby="trust-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.trust.eyebrow}</p>
          <h2 id="trust-title" className="h2">{copy.trust.title}</h2>
          <p className="body-l">{copy.trust.support}</p>
        </Reveal>
        <div className="trust__bento">
          {cards.map((c, i) => (
            <Reveal key={c.id} className="tb" delay={Math.min(i, 3) * 0.05}>
              <SpotlightCard className="tcard2">
                <span className="tcard2__ic"><c.icon aria-hidden /></span>
                <h3 className="tcard2__t">{c.title}</h3>
                <p className="body-s">{c.text}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
