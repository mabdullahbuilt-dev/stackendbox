import { HeroCopy } from "./HeroCopy";
import { HeroSparks } from "./HeroSparks";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title" data-hero-track>
      <div className="hero__sticky">
        <div className="hero__bg" aria-hidden><i className="hero__stars" /><i className="hero__nebula" /><i className="hero__code" /><HeroSparks /></div>
        <div className="container hero__grid">
          <HeroCopy />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
