"use client";
import { ArrowRight } from "lucide-react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { ButtonLink } from "@/components/ui/Button";
import { Magnet } from "@/components/vendor/Magnet";

export function HeroCopy() {
  const h = copy.hero;
  return (
    <div className="hero__copy" data-hero-copy>
      <p className="eyebrow hero-in" style={{ ["--d" as string]: "0ms" }}>{h.eyebrow}</p>
      <h1 id="hero-title" className="hero__h1">
        {h.lines.map((l, i) => (
          <span key={l} className="line"><span className={`line__in ${i > 0 ? "tone2" : ""}`} style={{ ["--d" as string]: `${100 + i * 90}ms` }}>{l}</span></span>
        ))}
      </h1>
      <p className="body-l hero-in" style={{ ["--d" as string]: "380ms" }}>{h.support}</p>
      <div className="hero__ctas hero-in" style={{ ["--d" as string]: "480ms" }}>
        <Magnet>
          <ButtonLink href="/#start" size="lg" onClick={() => track("hero_start_project")}>{h.primary}</ButtonLink>
        </Magnet>
        <ButtonLink href="/#work" variant="secondary" size="lg" arrow={false} onClick={() => track("hero_view_work")}>
          {h.secondary}<ArrowRight className="arrow" aria-hidden />
        </ButtonLink>
      </div>
      <ul className="hero__chips hero-in" style={{ ["--d" as string]: "560ms" }} aria-label="What we build">
        {h.chips.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}
