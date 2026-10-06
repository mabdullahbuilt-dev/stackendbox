import { copy } from "@/content/copy";
import { projectImage, projects } from "@/content/projects";
import { Reveal } from "@/components/ui/Reveal";
import { testimonials } from "@/content/testimonials";
import { devTestimonialFixtures } from "@/content/testimonials.fixtures";
import { Showcase, type ShowcaseItem } from "./Showcase";

/** Real shipped products, shown inside the Work & Proof chapter as a moving showcase. */
export function WorkGallery() {
  // Only projects with a real screenshot are shown; a project without one is omitted rather than faked.
  const items: ShowcaseItem[] = projects.flatMap((p) => { const img = projectImage(p.slug); return img ? [{ slug: p.slug, title: p.title, text: p.text, tags: p.tags, img, alt: p.imageAlt, liveUrl: p.liveUrl, githubUrl: p.githubUrl }] : []; });
  // Real, approved quotes only. The layout fixture is used in development builds and never in production.
  const quotes = testimonials.length ? testimonials : process.env.NODE_ENV === "development" ? devTestimonialFixtures : [];
  return (
    <div id="work" className="work" aria-labelledby="work-title">
      <Reveal className="sec-head">
        <p className="eyebrow">{copy.work.eyebrow}</p>
        <h3 id="work-title" className="h2">{copy.work.title}</h3>
        <p className="body-l">{copy.work.support}</p>
      </Reveal>
      <Showcase items={items} quotes={quotes} cta={copy.work.cta} />
    </div>
  );
}
