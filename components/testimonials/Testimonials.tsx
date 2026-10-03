"use client";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { copy } from "@/content/copy";
import { testimonials } from "@/content/testimonials";
import { useMotionPreference } from "@/lib/useMotionPreference";

/** Renders nothing unless at least one testimonial is verified. No placeholders, ever. */
export function Testimonials() {
  const { reduced } = useMotionPreference();
  const list = testimonials.filter((t) => t.verified === true);
  const [i, setI] = useState(0);
  if (list.length === 0) return null;
  const t = list[i % list.length];
  const others = list.filter((_, k) => k !== i % list.length).slice(0, 2);
  return (
    <section id="testimonials" className="section tst" aria-labelledby="tst-title">
      <div className="container">
        <p className="eyebrow">{copy.testimonials.eyebrow}</p>
        <h2 id="tst-title" className="sr-only">{copy.testimonials.title}</h2>
        <div className="tst__grid">
          <figure className="tst__main">
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={t.id} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
                <blockquote>{t.quote}</blockquote>
                <figcaption><b>{t.name}</b><span>{t.role}, {t.company}</span><em className="mono">{t.projectType}</em></figcaption>
              </m.div>
            </AnimatePresence>
          </figure>
          <div className="tst__side">
            {others.map((o) => (
              <button key={o.id} className="tst__small" onClick={() => setI(list.indexOf(o))}><span>{o.quote.slice(0, 120)}</span><b>{o.name}</b></button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
