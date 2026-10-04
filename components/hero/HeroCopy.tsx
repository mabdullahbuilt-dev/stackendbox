"use client";
import { ArrowRight, Mail } from "lucide-react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import { siteConfig } from "@/site.config";
import { CalButton } from "@/components/ui/CalButton";
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
          <ButtonLink href="/#start" size="lg" onClick={(e) => { track("hero_start_project"); goToBuilder(e); }}>{h.primary}</ButtonLink>
        </Magnet>
        <CalButton placement="hero" />
      </div>
      {siteConfig.contactEmail && (
        <p className="hero__mail hero-in" style={{ ["--d" as string]: "520ms" }}>
          <Mail aria-hidden />Or email us at <a href={`mailto:${siteConfig.contactEmail}`} onClick={() => track("contact_clicked", { placement: "hero", kind: "email" })}>{siteConfig.contactEmail}</a>
        </p>
      )}
    </div>
  );
}
