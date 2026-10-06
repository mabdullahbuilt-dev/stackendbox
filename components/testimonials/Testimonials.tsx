"use client";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { copy } from "@/content/copy";
import { isPublishable, testimonials } from "@/content/testimonials";
import { useMotionPreference } from "@/lib/useMotionPreference";

/**
 * Editorial testimonials. Renders nothing unless at least one entry is verified AND permission confirmed.
 * No autoplay: visitors move through quotes with the index controls.
 */
export function Testimonials() {
  const { reduced } = useMotionPreference();
  const list = testimonials.filter(isPublishable);
  const [i, setI] = useState(0);
  if (list.length === 0) return null;
  const t = list[i % list.length];
  const dur = reduced ? 0 : 0.35;
  const support = list.filter((x) => x.id !== t.id).slice(0, 2);
  return (
    <section id="testimonials" className="section tst" aria-labelledby="tst-title">
      <div className="container">
        <p className="eyebrow">{copy.testimonials.eyebrow}</p>
        <h2 id="tst-title" className="h2">{copy.testimonials.title}</h2>
        <div className="tst__grid">
          <figure className="tst__main" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <m.blockquote key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur }}>{t.quote}</m.blockquote>
            </AnimatePresence>
          </figure>
          <aside className="tst__who">
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur }}>
                {t.avatar && <Image className="tst__avatar" src={t.avatar} alt="" width={72} height={72} />}
                <b>{t.name}</b>
                <span>{t.role}</span>
                              </m.div>
            </AnimatePresence>
            {list.length > 1 && (
              <div className="tst__ctl" role="group" aria-label="Choose testimonial">
                {list.map((x, k) => (
                  <button key={x.id} type="button" aria-label={`Show testimonial ${k + 1} of ${list.length}: ${x.name}`} aria-current={k === i % list.length} onClick={() => setI(k)} className="tst__dot" />
                ))}
              </div>
            )}
          </aside>
          {support.length > 0 && (
            <div className="tst__sup">
              {support.map((x) => (
                <button key={x.id} type="button" className="tst__small" onClick={() => setI(list.indexOf(x))}>
                  
                  <span>{x.quote.length > 140 ? `${x.quote.slice(0, 137)}...` : x.quote}</span>
                  <b>{x.name}{x.role ? `, ${x.role}` : ""}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
