"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useMedia } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { loadGsap } from "@/lib/gsap";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { After, Before } from "./manualFaces";

type Tile = { id: keyof typeof After; before?: keyof typeof Before; s0: [number, number, number, number]; pair?: string; isNew?: boolean };
// s0 = [x% of stage width, y% of stage height, rotation°, scale] relative to the tile's final slot
const TILES: Tile[] = [
  { id: "crm", before: "crm", s0: [34, 26, -3, 0.9], pair: "c" },
  { id: "messages", before: "whatsapp", s0: [-16, 30, 2.5, 0.62], pair: "a" },
  { id: "ai", before: "note", s0: [-22, 40, 4, 0.9] },
  { id: "booking", before: "calendar", s0: [10, -26, -4, 0.82], pair: "b" },
  { id: "automation", s0: [0, 0, 0, 1], isNew: true },
  { id: "tasks", before: "tasks", s0: [-30, -34, 3, 0.9] },
  { id: "analytics", before: "spreadsheet", s0: [30, -36, -2.5, 0.5], pair: "c" },
  { id: "alerts", s0: [0, 0, 0, 1], isNew: true },
];
const GHOSTS = [
  { id: "email", face: "email" as const, s0: [-26, -6, -3, 0.9], to: "messages", pair: "a" },
  { id: "form", face: "form" as const, s0: [26, 30, 4, 0.9], to: "booking", pair: "b" },
];

const SR = "Before: spreadsheets, a chat thread, an inbox, a calendar with clashing events, a booking form, a stale CRM record, a sticky note and a duplicated task list. After: one operation with CRM, messages, booking, automation rules, tasks, analytics, an AI assistant and team alerts.";

export function ManualToAutomated() {
  const { reduced } = useMotionPreference();
  const wide = useMedia("(min-width: 600px)", true);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"manual" | "system">("manual");
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const mode = !mounted || reduced ? "static" : wide ? "scrub" : "oneshot";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mode === "static") return;
    const root = stage.current;
    const pinEl = pin.current;
    if (!root || !pinEl) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);
        const W = () => root.clientWidth;
        const H = () => root.clientHeight;
        const tiles = q<HTMLElement>("[data-tile]");
        const s0 = (k: 0 | 1 | 2 | 3) => (_: number, el: Element) => {
          const v = (el as HTMLElement).dataset.s0!.split(",").map(Number);
          return k === 0 ? (v[0] / 100) * W() : k === 1 ? (v[1] / 100) * H() : v[k];
        };
        const s1 = (k: 0 | 1) => (_: number, el: Element) => {
          const v = (el as HTMLElement).dataset.s0!.split(",").map(Number);
          return (k === 0 ? (v[0] / 100) * W() : (v[1] / 100) * H()) * 0.42;
        };
        const oldTiles = tiles.filter((t) => !t.hasAttribute("data-new"));
        const newTiles = tiles.filter((t) => t.hasAttribute("data-new"));
        const ghosts = q<HTMLElement>("[data-ghost]");
        const befores = q(".mt__before");
        const afters = q(".mt__after");
        const caps = q<HTMLElement>("[data-cap]");

        gsap.set(oldTiles, { x: s0(0), y: s0(1), rotation: s0(2), scale: s0(3) });
        gsap.set(newTiles, { opacity: 0, y: 18, scale: 0.96 });
        gsap.set(ghosts, { x: s0(0), y: s0(1), rotation: s0(2), scale: s0(3), opacity: 1 });
        gsap.set(befores, { opacity: 1 });
        gsap.set(afters, { opacity: 0 });
        gsap.set(q(".ops__chrome"), { opacity: 0, scale: 0.985 });
        gsap.set(q(".slot-ol"), { opacity: 0 });
        gsap.set(caps, { opacity: 0 });
        gsap.set(caps[0], { opacity: 1 });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
        tlRef.current = tl;
        // 02 MATCHED
        tl.to(oldTiles, { x: s1(0), y: s1(1), rotation: 0, scale: (_: number, el: Element) => 0.5 * ((el as HTMLElement).dataset.s0!.split(",").map(Number)[3]) + 0.5, duration: 0.2 }, 0.2);
        tl.to(ghosts, { x: (_: number, el: Element) => s1(0)(0, el) * 1.0, y: (_: number, el: Element) => s1(1)(0, el), rotation: 0, scale: 0.95, duration: 0.2 }, 0.2);
        tl.fromTo(q("[data-pair]"), { boxShadow: "0 0 0 0px rgba(65,105,255,0)" }, { boxShadow: "0 0 0 1px rgba(111,141,255,0.9)", duration: 0.04, yoyo: true, repeat: 1, ease: "none" }, 0.32);
        // 03 CLEANED UP
        tl.to(ghosts, { scale: 0.45, opacity: 0, duration: 0.16 }, 0.42);
        tl.to(q(".trow[data-dup]"), { height: 0, opacity: 0, marginTop: 0, paddingBlock: 0, duration: 0.08, stagger: 0.03 }, 0.42);
        tl.to(q(".frag--note"), { rotation: 0, duration: 0.1 }, 0.44);
        // faces cross-fade as modules take shape
        tl.to(befores, { opacity: 0, duration: 0.08, stagger: 0.012 }, 0.5);
        tl.to(afters, { opacity: 1, duration: 0.08, stagger: 0.012 }, 0.54);
        // 04 CONNECTED
        tl.to(q(".slot-ol"), { opacity: 1, duration: 0.05, stagger: 0.01 }, 0.56);
        tl.to(oldTiles, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.22, stagger: 0.012, ease: "power2.inOut" }, 0.6);
        tl.to(q(".slot-ol"), { opacity: 0, duration: 0.04 }, 0.82);
        // 05 RUNNING
        tl.to(q(".ops__chrome"), { opacity: 1, scale: 1, duration: 0.1 }, 0.8);
        tl.to(newTiles, { opacity: 1, y: 0, scale: 1, duration: 0.1, stagger: 0.05, ease: "power3.out" }, 0.84);
        tl.fromTo(q(".vd"), { scale: 0 }, { scale: 1, duration: 0.04, stagger: 0.02, ease: "power3.out" }, 0.92);
        // captions
        [0.2, 0.4, 0.6, 0.8].forEach((t, i) => {
          tl.to(caps[i], { opacity: 0, duration: 0.02 }, t).to(caps[i + 1], { opacity: 1, duration: 0.02 }, t);
        });
        tl.to({}, { duration: 0 }, 1);

        let done = false;
        const phaseOf = (p: number) => (p < 0.2 ? 1 : p < 0.4 ? 2 : p < 0.6 ? 3 : p < 0.8 ? 4 : 5);

        if (mode === "scrub") {
          const desktop = window.matchMedia("(min-width: 1024px)").matches;
          ScrollTrigger.create({
            trigger: pinEl,
            start: "top top",
            end: desktop ? "+=170%" : "+=120%",
            pin: true,
            anticipatePin: 1,
            scrub: 0.6,
            invalidateOnRefresh: true,
            animation: tl,
            onUpdate: (self) => {
              root.dataset.phase = String(phaseOf(self.progress));
              if (!done && self.progress >= 0.9) {
                done = true;
                track("scene_complete", { scene: "manual_to_auto" });
              }
            },
          });
        } else {
          tl.duration(1.6);
          root.dataset.phase = "1";
          const io = new IntersectionObserver(
            ([e]) => {
              if (e.isIntersecting && !done) {
                done = true;
                tl.play();
                setView("system");
                track("scene_complete", { scene: "manual_to_auto" });
              }
            },
            { threshold: 0.6 },
          );
          io.observe(root);
          return () => io.disconnect();
        }
      }, root);
      cleanup = () => {
        tlRef.current = null;
        ctx.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mode]);

  const flip = (to: "manual" | "system") => {
    setView(to);
    track("scene_replay", { scene: "manual_to_auto" });
    if (to === "system") tlRef.current?.play();
    else tlRef.current?.reverse();
  };

  return (
    <section id="manual" className="manual section--alt" aria-labelledby="manual-title">
      <a href="#bridge" className="skip-link">Skip automation scene</a>
      <div className="manual__pin" ref={pin}>
        <div className="container">
          <div className="manual__head">
            <div>
              <p className="eyebrow">{copy.manual.eyebrow}</p>
              <h2 id="manual-title" className="h2">{copy.manual.title}</h2>
            </div>
            <p className="body-l">{copy.manual.support}</p>
          </div>

          {mode === "static" && (
            <div className="mstatic">
              <p className="mono mono--muted">BEFORE — SCATTERED</p>
              <div className="mcollage" aria-hidden>
                {(Object.keys(Before) as (keyof typeof Before)[]).map((k) => <div key={k}>{Before[k]}</div>)}
              </div>
              <p className="mono mono--muted">AFTER — ONE SYSTEM</p>
            </div>
          )}

          <div className="mstage" ref={stage} data-mode={mode} aria-hidden>
            <div className="ops">
              <div className="ops__chrome" />
              <div className="ops__bar mono"><span>OPERATIONS</span><span>SAMPLE DATA</span></div>
              <div className="ops__grid">
                {TILES.map((t) => (
                  <div key={t.id} className={`slot-ol slot-ol--${t.id}`} />
                ))}
                {TILES.map((t) => (
                  <div
                    key={t.id}
                    className={`mt mt--${t.id}`}
                    data-tile
                    data-new={t.isNew ? "" : undefined}
                    data-pair={t.pair}
                    data-s0={t.s0.join(",")}
                  >
                    <div className="mt__drift">
                      {t.before && <div className="mt__before">{Before[t.before]}</div>}
                      <div className="mt__after">{After[t.id]}{t.isNew && <i className="vd" />}</div>
                    </div>
                  </div>
                ))}
              </div>
              {GHOSTS.map((g) => (
                <div key={g.id} className={`mt ghost ghost--${g.id}`} data-ghost data-s0={g.s0.join(",")}>
                  <div className="mt__drift">{Before[g.face]}</div>
                </div>
              ))}
            </div>
            <div className="mcaps mono" aria-hidden>
              {copy.manual.phases.map((p) => <span key={p} data-cap>{p}</span>)}
            </div>
          </div>

          {mode === "static" && (
            <ol className="mphases mono mono--muted">{copy.manual.phases.map((p) => <li key={p}>{p}</li>)}</ol>
          )}
          <p className="sr-only">{SR}</p>

          <div className="manual__foot">
            {mode === "oneshot" && (
              <div className="segmented" role="group" aria-label="Show manual work or the automated system">
                <button aria-pressed={view === "manual"} onClick={() => flip("manual")}>Manual</button>
                <button aria-pressed={view === "system"} onClick={() => flip("system")}>System</button>
              </div>
            )}
            <Link href="/#start" className="link-cta" onClick={() => { track("capability_intent_cta_click", { capability: "automation", placement: "manual" }); presetBuilder("Automation"); }}>
              {copy.manual.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
