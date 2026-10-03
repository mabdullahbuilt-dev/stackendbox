"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { track } from "@/lib/analytics";
import { useMedia, FINE_POINTER } from "@/lib/hooks";
import { loadGsap } from "@/lib/gsap";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { heroModules, heroModulesMobile } from "./modules";
import type { HeroBus } from "./HeroObject";

type ObjProps = React.ComponentProps<typeof import("./HeroObject").default>;

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function lowEnd() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return n.connection?.saveData === true || (n.deviceMemory !== undefined && n.deviceMemory <= 4);
}

const ss = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const seg = (p: number, a: number, b: number) => ss((p - a) / (b - a));

/** Scroll progress p (0..1) to the 3D state. Every phase stays inside the hero stage. */
function stateAt(p: number, n: number) {
  const open = seg(p, 0.08, 0.25) * (1 - seg(p, 0.7, 0.85));
  const zoom = seg(p, 0.04, 0.2) * (1 - seg(p, 0.7, 0.88));
  const t = Math.min(0.999, Math.max(0, (p - 0.25) / 0.45));
  const inAct = p >= 0.25 && p < 0.7;
  const fromBottom = Math.floor(t * n);
  return {
    explode: open,
    zoom,
    active: inAct ? n - 1 - fromBottom : -1,
    pulse: inAct ? (t * 2.2) % 1 : 0,
    settle: seg(p, 0.7, 0.9),
  };
}

export function HeroVisual() {
  const { reduced } = useMotionPreference();
  const mobile = useMedia("(max-width: 767px)");
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const bus = useRef<HeroBus>({ explode: 0, zoom: 0, active: -1, pulse: 0, settle: 0, px: 0, py: 0 });
  const [Obj, setObj] = useState<ComponentType<ObjProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [near, setNear] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  const live = !!Obj && !reduced && !degraded && near;
  const modules = live && mobile ? heroModulesMobile : heroModules;

  // Load the 3D chunk after first paint when the device qualifies.
  useEffect(() => {
    if (reduced || degraded || Obj) return;
    if (lowEnd() || !webglOK()) return;
    let cancelled = false;
    const load = () => import("./HeroObject").then((m) => !cancelled && setObj(() => m.default));
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ric ? ric(load, { timeout: 1500 }) : window.setTimeout(load, 600);
    return () => {
      cancelled = true;
      if (!ric) clearTimeout(id);
    };
  }, [reduced, degraded, Obj]);

  // Visibility lifecycle: pause when offscreen, unmount when far away.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const a = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio > 0.05), { threshold: [0, 0.05, 0.2] });
    const b = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "150% 0px 150% 0px" });
    a.observe(el);
    b.observe(el);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);

  // Scroll-scrubbed choreography. GSAP only writes into refs and the DOM, never React state.
  useEffect(() => {
    if (reduced) return;
    const track_ = wrap.current?.closest<HTMLElement>("[data-hero-track]");
    if (!track_) return;
    let kill: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { ScrollTrigger } = await loadGsap();
      if (cancelled) return;
      const n = () => (window.matchMedia("(max-width: 767px)").matches ? heroModulesMobile.length : heroModules.length);
      const mods = () => (window.matchMedia("(max-width: 767px)").matches ? heroModulesMobile : heroModules);
      let lastActive = -2;
      const st = ScrollTrigger.create({
        trigger: track_,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const s = stateAt(self.progress, n());
          Object.assign(bus.current, s);
          bus.current.invalidate?.();
          if (s.active !== lastActive) {
            lastActive = s.active;
            const m = s.active >= 0 ? mods()[s.active] : null;
            if (capRef.current) {
              capRef.current.dataset.on = m ? "true" : "false";
              if (m) capRef.current.innerHTML = `<strong>${m.name}</strong><span>${m.sub}</span>`;
            }
          }
        },
      });
      kill = () => st.kill();
    })();
    return () => { cancelled = true; kill?.(); };
  }, [reduced]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !window.matchMedia(FINE_POINTER).matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    bus.current.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    bus.current.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    bus.current.invalidate?.();
  }, []);
  const onLeave = useCallback(() => {
    bus.current.px = 0;
    bus.current.py = 0;
    bus.current.invalidate?.();
  }, []);

  const hover = useCallback((i: number | null, via: "hover" | "focus" = "hover") => {
    setHovered(i);
    window.clearTimeout(hoverTimer.current);
    if (i !== null) {
      hoverTimer.current = window.setTimeout(
        () => track(via === "focus" ? "hero_module_focus" : "hero_module_hover", { module: modules[i]?.name }),
        400,
      );
    }
  }, [modules]);

  const onKey = (e: React.KeyboardEvent) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const cur = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (cur + 1) % items.length;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (cur - 1 + items.length) % items.length;
    if (next >= 0) {
      e.preventDefault();
      items.forEach((b, i) => (b.tabIndex = i === next ? 0 : -1));
      items[next].focus();
    }
  };

  const staticList = reduced; // reduced motion: module list is plain visible text. Never toggled by canvas load (avoids CLS).

  return (
    <div className="hero__visual" ref={wrap} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="hero__stage" ref={stage}>
        <div className="hero__poster" data-ready={ready && live} aria-hidden>
          <Image
            src={reduced ? "/hero/stack-exploded.webp" : "/hero/stack-assembled.webp"}
            alt=""
            fill
            sizes="(max-width: 767px) 92vw, (max-width: 1279px) 56vw, 780px"
            priority
            className="hero__poster-img"
          />
        </div>
        {live && Obj && (
          <div className="hero__canvas" data-ready={ready}>
            <Obj
              bus={bus.current}
              modules={modules}
              hovered={hovered}
              onHover={(i) => hover(i)}
              frameloop={visible ? "demand" : "never"}
              dpr={mobile ? 1.25 : 1.5}
              onReady={() => setReady(true)}
              onDegrade={() => setDegraded(true)}
            />
          </div>
        )}
      </div>
      <div ref={capRef} className="hero__cap" data-on="false" aria-hidden />
      <ul
        ref={list}
        className={`module-list ${staticList ? "module-list--static" : ""}`}
        aria-label="StackEndBox capabilities"
        onKeyDown={onKey}
      >
        {modules.map((m, i) => (
          <li key={m.name} data-active={hovered === i} style={{ ["--accent" as string]: m.accent }}>
            <button
              type="button"
              tabIndex={i === 0 ? 0 : -1}
              onFocus={() => hover(i, "focus")}
              onBlur={() => hover(null)}
              onPointerEnter={() => hover(i)}
              onPointerLeave={() => hover(null)}
            >
              <span className="module-list__name">{m.name}</span>
              <span className="module-list__sub">{m.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
