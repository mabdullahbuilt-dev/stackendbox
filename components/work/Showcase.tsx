"use client";
import { ArrowLeft, ArrowRight, Maximize2, Pause, Play, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChapterCycle, useChapterRunning } from "@/lib/chapters";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Chip } from "@/components/ui/StatusChip";
import type { Testimonial } from "@/content/testimonials";
import { ProjectLinks } from "./ProjectLinks";

export type ShowcaseItem = { slug: string; title: string; text: string; tags: string[]; img: string; alt: string; liveUrl?: string; githubUrl?: string };

const AUTO_MS = 6200;

/**
 * Shipped products as a product stage: the active build's real screenshot is shown large, uncropped, on its own
 * canvas; the neighbouring builds sit at the edges at lower depth. The narrative (number, title, text, capabilities,
 * links) is an open panel beside it, with a preview of the previous and next build. A numbered navigator carries the
 * auto-advance progress. Advances only while the chapter is active and in view; hover, focus, drag or the pause control
 * stop it. Drag or swipe, arrow keys, previous/next, or the navigator move it. Each visit starts again from the first build.
 */
export function Showcase({ items, quotes, cta }: { items: ShowcaseItem[]; quotes: Testimonial[]; cta: string }) {
  const { reduced } = useMotionPreference();
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const inView = useInView(root, "-20% 0px -20% 0px");
  const running = useChapterRunning("proof");
  const cycle = useChapterCycle("proof");
  const n = items.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const cur = items[i];
  const prev = items[(i - 1 + n) % n];
  const next = items[(i + 1) % n];
  const live = !reduced && !paused && !hold && inView && running && !zoom;

  useEffect(() => { setI(0); }, [cycle]);
  useEffect(() => {
    if (!live || n < 2) return;
    const t = setTimeout(() => go(i + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [i, live, n, go]);

  // full-size viewer: the real screenshot at its native width, pannable, for phones and for a closer look
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  // drag / swipe: transform only, released on pointerup
  const drag = useRef<{ x: number; id: number } | null>(null);
  const down = (e: React.PointerEvent) => { if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return; drag.current = { x: e.clientX, id: e.pointerId }; setHold(true); };
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
      <div className="shw__grid">
        <div className="shw__stage">
          <div className="shw__view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <div className="shw__track" ref={track} style={{ ["--i" as string]: i }} data-hold={hold}>
              {items.map((p, k) => (
                <article key={p.slug} className="shw__slide" data-on={k === i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${p.title}`} aria-hidden={k !== i} inert={k !== i}>
                  <Image src={p.img} alt="" fill sizes="160px" className="shw__amb" draggable={false} aria-hidden />
                  <div className="shw__canvas"><Image src={p.img} alt={p.alt} fill sizes="(max-width: 900px) 94vw, (max-width: 1500px) 70vw, 940px" className="shw__pic" draggable={false} priority={k === 0} /></div>
                </article>
              ))}
            </div>
            <button type="button" className="shw__zoom" aria-label={`Open ${cur.title} full size`} onClick={() => setZoom(true)}><Maximize2 aria-hidden /><span>Full size</span></button>
          </div>
          <div className="shw__nav" role="group" aria-label="Choose a project">
            {items.map((p, k) => (
              <button key={p.slug} type="button" className="shw__tab" aria-label={`Show ${p.title}`} aria-current={k === i} onClick={() => go(k)}>
                <span className="mono shw__tabn">{String(k + 1).padStart(2, "0")}</span><b>{p.title}</b>
                <i className="shw__prog" data-run={k === i && live} style={{ animationDuration: `${AUTO_MS}ms` }} />
              </button>
            ))}
            <div className="shw__ctl">
              <button type="button" className="shw__btn" aria-label="Previous project" onClick={() => go(i - 1)}><ArrowLeft aria-hidden /></button>
              <button type="button" className="shw__btn" aria-label="Next project" onClick={() => go(i + 1)}><ArrowRight aria-hidden /></button>
              {!reduced && <button type="button" className="shw__btn" aria-label={paused ? "Resume automatic movement" : "Pause automatic movement"} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>{paused ? <Play aria-hidden /> : <Pause aria-hidden />}</button>}
            </div>
          </div>
        </div>

        <div className="shw__panel" aria-live="polite">
          <div className="shw__copy" key={cur.slug}>
            <p className="mono shw__n"><span>{String(i + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")} · SHIPPED BY STACKENDBOX</p>
            <h4 className="shw__t">{cur.title}</h4>
            <p className="shw__p">{cur.text}</p>
            <ul className="wk__tags" aria-label={`${cur.title} capabilities`}>{cur.tags.slice(0, 4).map((t) => <li key={t}><Chip>{t}</Chip></li>)}</ul>
            <ProjectLinks slug={cur.slug} liveUrl={cur.liveUrl} githubUrl={cur.githubUrl} cta={cta} />
          </div>
          {n > 1 && (
            <div className="shw__peek" aria-label="Neighbouring projects">
              <button type="button" className="shw__pk" onClick={() => go(i - 1)} aria-label={`Previous: ${prev.title}`}>
                <span className="shw__pkimg"><Image src={prev.img} alt="" fill sizes="96px" /></span><span className="shw__pkt"><em className="mono">PREVIOUS</em><b>{prev.title}</b></span>
              </button>
              <button type="button" className="shw__pk" onClick={() => go(i + 1)} aria-label={`Next: ${next.title}`}>
                <span className="shw__pkimg"><Image src={next.img} alt="" fill sizes="96px" /></span><span className="shw__pkt"><em className="mono">NEXT</em><b>{next.title}</b></span>
              </button>
            </div>
          )}
        </div>
      </div>

      <dialog ref={dlg} className="shw__dlg" aria-label={`${cur.title} screenshot, full size`} onClose={() => setZoom(false)} onClick={(e) => { if (e.target === e.currentTarget) setZoom(false); }}>
        <button type="button" className="shw__x" aria-label="Close full size view" onClick={() => setZoom(false)}><X aria-hidden /></button>
        <div className="shw__full"><Image src={cur.img} alt={cur.alt} width={1400} height={680} sizes="1400px" className="shw__fullpic" /></div>
      </dialog>

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
