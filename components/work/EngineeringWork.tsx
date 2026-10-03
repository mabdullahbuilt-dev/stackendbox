import Image from "next/image";
import { copy } from "@/content/copy";
import { projectImage, projects } from "@/content/projects";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/StatusChip";
import { ProjectLinks } from "./ProjectLinks";

/** Server component: sticky-stack of real engineering projects. Images come from /public/work when supplied. */
export function EngineeringWork() {
  return (
    <section id="work" className="section work" aria-labelledby="work-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.work.eyebrow}</p>
          <h2 id="work-title" className="h2">{copy.work.title}</h2>
          <p className="body-l">{copy.work.support}</p>
        </Reveal>

        <div className="work__stack">
          {projects.map((p, i) => {
            const img = projectImage(p.slug);
            return (
              <article key={p.slug} className="wcard" style={{ ["--i" as string]: i }} aria-labelledby={`work-${p.slug}`}>
                <div className="wcard__media" data-has-img={!!img}>
                  {img ? (
                    <div className="wcard__frame">
                      <Image src={img} alt={p.imageAlt} fill sizes="(max-width: 1023px) 92vw, 760px" className="wcard__img" loading="lazy" />
                    </div>
                  ) : (
                    <div className="wcard__type" aria-hidden>
                      <span className="mono">{p.kicker.toUpperCase()}</span>
                      <b>{p.title}</b>
                    </div>
                  )}
                </div>
                <div className="wcard__body">
                  <p className="mono mono--muted">{String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</p>
                  <h3 id={`work-${p.slug}`} className="wcard__title">{p.title}</h3>
                  <p className="body-l">{p.description}</p>
                  <ul className="wcard__tags" aria-label={`${p.title} technologies`}>
                    {p.tags.map((t) => <li key={t}><Chip>{t}</Chip></li>)}
                  </ul>
                  <ProjectLinks slug={p.slug} liveUrl={p.liveUrl} githubUrl={p.githubUrl} cta={copy.work.cta} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
