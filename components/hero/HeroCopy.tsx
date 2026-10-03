"use client";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { ButtonLink } from "@/components/ui/Button";
import { Magnet } from "@/components/vendor/Magnet";

export function HeroCopy() {
  const h = copy.hero;
  return (
    <div className="hero__copy" data-hero-copy>
      <p className="eyebrow hero-in" style={{ ["--d" as string]: "0ms" }}>{h.eyebrow}</p>
      <h1 id="hero-title" className="h-xl hero__h1">
        <span className="line"><span className="line__in" style={{ ["--d" as string]: "100ms" }}>{h.h1a}</span></span>{" "}
        <span className="line"><span className="line__in tone2" style={{ ["--d" as string]: "190ms" }}>{h.h1b}</span></span>
      </h1>
      <p className="body-l hero-in" style={{ ["--d" as string]: "310ms" }}>{h.support}</p>
      <div className="hero__ctas hero-in" style={{ ["--d" as string]: "430ms" }}>
        <Magnet>
          <ButtonLink href="/#start" size="lg" onClick={() => track("hero_cta_primary_click")}>{h.primary}</ButtonLink>
        </Magnet>
        <ButtonLink href="/#explorer" variant="secondary" size="lg" onClick={() => track("hero_cta_secondary_click")}>
          {h.secondary}
        </ButtonLink>
      </div>
      <p className="mono mono--muted hero-in hero__micro" style={{ ["--d" as string]: "500ms" }}>{h.micro}</p>
    </div>
  );
}
