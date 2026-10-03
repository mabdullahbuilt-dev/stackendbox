import Link from "next/link";
import { copy } from "@/content/copy";
import { demos } from "@/content/demos";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/StatusChip";
import { SpotlightCard } from "@/components/vendor/SpotlightCard";
import { LogoWall, MetricStrip, TestimonialSlot } from "./slots";

export function Trust() {
  return (
    <section id="trust" className="section section--alt trust" aria-labelledby="trust-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.trust.eyebrow}</p>
          <h2 id="trust-title" className="h2">{copy.trust.title}</h2>
          <p className="body-l">{copy.trust.support}</p>
        </Reveal>

        <div className="trust__grid">
          <Reveal className="trust__a">
            <SpotlightCard className="tcard">
              <p className="mono mono--muted">LIVE DEMO SYSTEMS</p>
              <h3 className="h3">Six demo systems you can explore right now.</h3>
              <div className="tcard__chips">{demos.map((d) => <Chip key={d.id} mono>{d.name}</Chip>)}</div>
              <Link href="/#proof" className="link-cta">See the systems running →</Link>
            </SpotlightCard>
          </Reveal>
          <Reveal className="trust__b" delay={0.06}>
            <SpotlightCard className="tcard">
              <p className="mono mono--muted">ENGINEERING WORK</p>
              <h3 className="h3">Products with real architecture behind them.</h3>
              <Link href="/#work" className="link-cta">Selected work →</Link>
            </SpotlightCard>
          </Reveal>
          <Reveal className="trust__c" delay={0.12}>
            <SpotlightCard className="tcard tcard--wide">
              <div>
                <p className="mono mono--muted">TECHNICAL DEPTH</p>
                <h3 className="h3">Auth, APIs, data, tests and deployment — all in scope.</h3>
              </div>
              <div className="tcard__chips">{["Auth", "APIs", "Data", "AI", "Integrations", "Tests", "Deployment"].map((c) => <Chip key={c} mono>{c}</Chip>)}</div>
              <Link href="/#depth" className="link-cta">What&apos;s underneath →</Link>
            </SpotlightCard>
          </Reveal>
        </div>

        <TestimonialSlot />
        <LogoWall />
        <MetricStrip />
      </div>
    </section>
  );
}
