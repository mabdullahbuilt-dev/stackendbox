import { HeroCopy } from "./HeroCopy";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title" data-hero-track>
      <div className="hero__sticky">
        <div className="hero__bg" aria-hidden />
        <div className="container hero__grid">
          <HeroCopy />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
