"use client";
import { m } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { readIntent, presetBuilder, saveIntent } from "@/lib/intent";
import { loadGsap } from "@/lib/gsap";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { FINE_POINTER } from "@/lib/hooks";
import { explorerItems } from "./data";
import { Stage } from "./Stage";

export function Explorer() {
  const { reduced } = useMotionPreference();
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const strip = useRef<HTMLDivElement>(null);
  const lastUser = useRef(0);
  const st = useRef<{ start: number; end: number } | null>(null);
  const dwell = useRef<number | undefined>(undefined);
  const first = useRef(true);
  const item = explorerItems[active];

  const select = useCallback((i: number, method: "scroll" | "click" | "key" | "swipe") => {
    setActive((cur) => {
      if (cur === i) return cur;
      track("capability_select", { capability: explorerItems[i].cap, method });
      return i;
    });
    if (method !== "scroll") {
      lastUser.current = Date.now();
      saveIntent(explorerItems[i].cap);
      // keep the pinned timeline aligned with the selection
      if (st.current) {
        const { start, end } = st.current;
        window.scrollTo({ top: start + ((i + 0.5) / explorerItems.length) * (end - start), behavior: reduced ? "auto" : "smooth" });
      }
    }
  }, [reduced]);

  // Dwell ≥ 2s on a state counts as intent.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.clearTimeout(dwell.current);
    dwell.current = window.setTimeout(() => saveIntent(item.cap), 2000);
    return () => window.clearTimeout(dwell.current);
  }, [active, item.cap]);

  // Desktop pin + progress → index. GSAP only for pin/progress.
  useEffect(() => {
    if (reduced) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled || !pin.current || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (min-height: 640px)", () => {
        const trig = ScrollTrigger.create({
          trigger: pin.current!,
          start: "top top",
          end: "+=175%",
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => { st.current = { start: self.start, end: self.end }; },
          onUpdate: (self) => {
            if (Date.now() - lastUser.current < 1500) return;
            const idx = Math.min(explorerItems.length - 1, Math.floor(self.progress * explorerItems.length));
            select(idx, "scroll");
          },
        });
        return () => { trig.kill(); st.current = null; };
      });
      ctx = mm;
    })();
    return () => { cancelled = true; ctx?.revert(); };
  }, [reduced, select]);

  // Intent: start on the remembered capability's row only through user choice → leave default.
  useEffect(() => { readIntent(); }, []);

  // keep the active chip centred in the mobile strip
  useEffect(() => {
    const el = tabs.current[active];
    const s = strip.current;
    if (el && s && s.scrollWidth > s.clientWidth) s.scrollTo({ left: el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = explorerItems.length;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (active + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (active - 1 + n) % n;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = n - 1;
    if (i >= 0) {
      e.preventDefault();
      select(i, "key");
      tabs.current[i]?.focus();
    }
  };

  const spot = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || !window.matchMedia(FINE_POINTER).matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section id="explorer" ref={root} className="explorer section--alt" aria-labelledby="explorer-title">
      <a href="#proof" className="skip-link skip-link--inline">Skip capability explorer</a>
      <div className="explorer__pin" ref={pin}>
        <div className="container explorer__grid">
          <div className="explorer__left">
            <div className="explorer__head">
              <p className="eyebrow">{copy.explorer.eyebrow}</p>
              <h2 id="explorer-title" className="h2">{copy.explorer.title}</h2>
              <p className="body-l">{copy.explorer.support}</p>
            </div>

            <div ref={strip} className="explorer__list" role="tablist" aria-orientation="vertical" aria-label="Capabilities" onKeyDown={onKey}>
              {explorerItems.map((it, i) => (
                <button
                  key={it.id}
                  ref={(el) => { tabs.current[i] = el; }}
                  role="tab"
                  id={`xt-${it.id}`}
                  aria-selected={active === i}
                  aria-controls="explorer-panel"
                  tabIndex={active === i ? 0 : -1}
                  className="xrow"
                  data-active={active === i}
                  onClick={() => select(i, "click")}
                  onPointerMove={spot}
                >
                  <span className="mono xrow__label">{it.label}</span>
                  <span className="xrow__more" aria-hidden={active !== i}>
                    <span className="xrow__sentence">{it.sentence}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="explorer__cta">
              <Link
                href="/#start"
                className="link-cta"
                onClick={() => {
                  track("capability_intent_cta_click", { capability: item.cap });
                  saveIntent(item.cap);
                  presetBuilder(item.need);
                }}
              >
                {item.cta}
              </Link>
              <Link href="/#proof" className="link-cta link-cta--quiet">{copy.explorer.after}</Link>
            </div>
          </div>

          <m.div
            className="explorer__right"
            initial={reduced ? false : { opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            drag={reduced ? false : "x"}
            dragSnapToOrigin
            dragElastic={0.12}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) < 60) return;
              const n = explorerItems.length;
              select(info.offset.x < 0 ? Math.min(n - 1, active + 1) : Math.max(0, active - 1), "swipe");
            }}
          >
            <div id="explorer-panel" role="tabpanel" aria-labelledby={`xt-${item.id}`} className="explorer__panel">
              <p className="sr-only">{item.sr}</p>
              <div aria-hidden>
                <Stage state={item.state} focusInput={item.focusInput} />
              </div>
            </div>
            <p className="body-l explorer__sentence" aria-hidden>{item.sentence}</p>
          </m.div>
        </div>
      </div>
    </section>
  );
}
