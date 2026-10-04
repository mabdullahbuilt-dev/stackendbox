import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { copy } from "@/content/copy";
import { projectImage, projects, type Project } from "@/content/projects";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/StatusChip";
import { ProjectLinks } from "./ProjectLinks";

function Card({ p, big }: { p: Project; big?: boolean }) {
  const img = projectImage(p.slug);
  return (
    <article className="wk" data-big={big} aria-labelledby={`wk-${p.slug}`}>
      <div className="wk__media">
        <div className="wk__frame">
          {img ? <Image src={img} alt={p.imageAlt} fill sizes={big ? "(max-width: 900px) 92vw, 640px" : "(max-width: 900px) 92vw, 420px"} className="wk__img" loading="lazy" /> : null}
        </div>
      </div>
      <div className="wk__body">
        <h3 id={`wk-${p.slug}`} className="wk__t">{p.title}</h3>
        <p className="wk__p">{p.text}</p>
        <ul className="wk__tags" aria-label={`${p.title} capabilities`}>{p.tags.slice(0, 3).map((t) => <li key={t}><Chip>{t}</Chip></li>)}</ul>
        <ProjectLinks slug={p.slug} liveUrl={p.liveUrl} githubUrl={p.githubUrl} cta={copy.work.cta} />
      </div>
    </article>
  );
}

/** Real shipped products, shown inside the Work & Proof chapter (one chapter, not two). */
export function WorkGallery() {
  // Only projects with a real screenshot are shown; a project without one is omitted rather than faked.
  const shown = projects.filter((p) => projectImage(p.slug));
  const feat = shown.filter((p) => p.featured);
  const rest = shown.filter((p) => !p.featured);
  return (
    <div id="work" className="work" aria-labelledby="work-title">
      <Reveal className="sec-head">
        <p className="eyebrow">{copy.work.eyebrow}</p>
        <h3 id="work-title" className="h2">{copy.work.title}</h3>
        <p className="body-l">{copy.work.support}</p>
      </Reveal>
      <div className="work__feat">{feat.map((p) => <Reveal key={p.slug}><Card p={p} big /></Reveal>)}</div>
      <div className="work__rest">{rest.map((p, i) => <Reveal key={p.slug} delay={i * 0.05}><Card p={p} /></Reveal>)}</div>
      <span className="sr-only"><ArrowUpRight aria-hidden /></span>
    </div>
  );
}
