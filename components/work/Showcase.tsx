"use client";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChapterCycle, useChapterRunning } from "@/lib/chapters";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Chip } from "@/components/ui/StatusChip";
import type { Testimonial } from "@/content/testimonials";
import { ProjectLinks } from "./ProjectLinks";

export type ShowcaseItem = { slug: string; title: string; text: string; tags: string[]; img: string; alt: string; liveUrl?: string; githubUrl?: string };

const AUTO_MS = 5600;

/**
 * Shipped products as a moving showcase: one large active build, neighbours partly visible, a thumbnail rail.
 * Advances on its own only while the chapter is active and in view; hover, focus, drag or the pause control stop it.
 * Drag or swipe to move, arrow keys when focused, or pick a thumbnail. Reduced motion: no auto movement.
 * Each visit to the chapter starts again from the first build.
 */
export function Showcase({ items, quotes, cta }: { items: ShowcaseItem[]; quotes: Testimonial[]; cta: string }) {
  const { reduced } = useMotionPreference();
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const inView = useInView(root, "-20% 0px -20% 0px");
  const running = useChapterRunning("proof");
  const cycle = useChapterCycle("proof");
  const n = items.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => { setI(0); }, [cycle]);
  useEffect(() => {
    if (reduced || paused || hold || !inView || !running || n < 2) return;
    const t = setTimeout(() => go(i + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [i, reduced, paused, hold, inView, running, n, go]);

  // drag / swipe: transform only, released on pointerup
  const drag = useRef<{ x: number; id: number } | null>(null);
  const down = (e: React.PointerEvent) => { if (e.button !== 0) return; drag.current = { x: e.clientX, id: e.pointerId }; setHold(true); };
  const move = (e: React.PointerEvent) => { if (!drag.current || !track.current) return; const dx = e.clientX - drag.current.x; if (Math.abs(dx) > 6) track.current.style.setProperty("--drag", `${dx}px`); };
  const up = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current = null; setHold(false);
    track.current?.style.setProperty("--drag", "0px");
    if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); } };

  return (
    <div className="shw" ref={root} role="region" aria-roledescription="carousel" aria-label="Shipped products"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHold(true); }} onPointerLeave={() => { if (!drag.current) setHold(false); }}
      onFocus={() => setHold(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false); }} onKeyDown={onKey}>
      <div className="shw__view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="shw__track" ref={track} style={{ ["--i" as string]: i }} data-hold={hold}>
          {items.map((p, k) => (
            <article key={p.slug} className="shw__slide" data-on={k === i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${p.title}`} aria-hidden={k !== i} inert={k !== i}>
              <div className="shw__img"><Image src={p.img} alt={p.alt} fill sizes="(max-width: 900px) 90vw, 860px" className="shw__pic" draggable={false} /></div>
              <div className="shw__info">
                <p className="mono shw__n">{String(k + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</p>
                <h4 className="shw__t">{p.title}</h4>
                <p className="shw__p">{p.text}</p>
                <ul className="wk__tags" aria-label={`${p.title} capabilities`}>{p.tags.slice(0, 4).map((t) => <li key={t}><Chip>{t}</Chip></li>)}</ul>
                <ProjectLinks slug={p.slug} liveUrl={p.liveUrl} githubUrl={p.githubUrl} cta={cta} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="shw__ctl">
        <button type="button" className="shw__btn" aria-label="Previous build" onClick={() => go(i - 1)}><ArrowLeft aria-hidden /></button>
        <div className="shw__rail" role="group" aria-label="Choose a build">
          {items.map((p, k) => (
            <button key={p.slug} type="button" className="shw__thumb" aria-label={`Show ${p.title}`} aria-current={k === i} onClick={() => go(k)}>
              <span className="shw__thumbimg"><Image src={p.img} alt="" fill sizes="120px" /></span><b>{p.title}</b><i className="shw__prog" data-run={k === i && !reduced && !paused && !hold && inView && running} style={{ animationDuration: `${AUTO_MS}ms` }} />
            </button>
          ))}
        </div>
        <button type="button" className="shw__btn" aria-label="Next build" onClick={() => go(i + 1)}><ArrowRight aria-hidden /></button>
        {!reduced && <button type="button" className="shw__btn" aria-label={paused ? "Resume automatic movement" : "Pause automatic movement"} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>{paused ? <Play aria-hidden /> : <Pause aria-hidden />}</button>}
      </div>
      {quotes.length > 0 && (
        <ul className="shw__quotes" aria-label="Client feedback">
          {quotes.map((q) => (
            <li key={q.id} className="shw__quote">
              <blockquote>{q.quote}</blockquote>
              <p>{q.avatar && <Image src={q.avatar} alt="" width={36} height={36} className="shw__av" />}<b>{q.name}</b>{q.role && <span>{q.role}</span>}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
