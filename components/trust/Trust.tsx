import { Boxes, CircleCheck, FlaskConical, GitBranch, Plug, Server, Smartphone, type LucideIcon } from "lucide-react";
import { copy } from "@/content/copy";
import { Reveal } from "@/components/ui/Reveal";
import { SpotlightCard } from "@/components/vendor/SpotlightCard";

const cards: { id: string; icon: LucideIcon; title: string; text: string; wide?: boolean }[] = [
  { id: "responsive", icon: Smartphone, title: "Responsive by default", text: "Desktop, tablet and mobile experiences are planned together, not patched afterward.", wide: true },
  { id: "deploy", icon: Server, title: "Production deployment", text: "We take the system through a real deployment path, not just a demo." },
  { id: "handoff", icon: GitBranch, title: "Clear handoff", text: "Code, configuration and system structure stay understandable." },
  { id: "iterate", icon: CircleCheck, title: "Iterative delivery", text: "You see working progress while the product is being built.", wide: true },
  { id: "test", icon: FlaskConical, title: "Tested before launch", text: "Critical workflows, permissions and edge cases are checked before release." },
  { id: "integ", icon: Plug, title: "Integration ready", text: "The product can connect to the systems your business already uses." },
];

function Devices() {
  return (
    <div className="tdev" aria-hidden><i className="tdev-d"><b /><b /></i><i className="tdev-t"><b /></i><i className="tdev-p"><b /></i></div>
  );
}

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
            <Reveal key={c.id} className={`tb tb--${c.id}`} delay={Math.min(i, 3) * 0.05}>
              <SpotlightCard className="tcard2">
                <span className="tcard2__ic"><c.icon aria-hidden /></span>
                <h3 className="tcard2__t">{c.title}</h3>
                <p className="body-s">{c.text}</p>
                {c.id === "responsive" && <Devices />}
                {c.id === "integ" && <Boxes className="tcard2__deco" aria-hidden />}
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
