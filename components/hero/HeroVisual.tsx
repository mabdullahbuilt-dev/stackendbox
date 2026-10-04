"use client";
import Image from "next/image";
import { Component, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { useMedia, FINE_POINTER } from "@/lib/hooks";
import { perfTier, type Tier } from "@/lib/perfTier";
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

/** A failure inside the 3D scene must never blank the hero: fall back to the poster. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { if (process.env.NODE_ENV !== "production") console.warn("[hero] 3D scene failed, using poster", e); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
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
  const capRef = useRef<HTMLDivElement>(null);
  const bus = useRef<HeroBus>({ explode: 0, zoom: 0, active: -1, pulse: 0, settle: 0, px: 0, py: 0 });
  const [Obj, setObj] = useState<ComponentType<ObjProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [tier, setTier] = useState<Tier>("C");
  const [near, setNear] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  const live = !!Obj && !reduced && !degraded && near;
  const modules = live && mobile ? heroModulesMobile : heroModules;

  // Load the 3D chunk automatically once the page has painted and the main thread is idle. No interaction needed,
  // so a visitor who scrolls straight away still gets the real scene (it reads the current scroll progress on mount).
  useEffect(() => {
    if (reduced || degraded || Obj) return;
    const t = perfTier();
    setTier(t);
    if (t === "C" || !webglOK()) return; // phones, save-data and low memory keep the poster
    let cancelled = false;
    let timer: number | undefined;
    const load = () => import("./HeroObject").then((m) => !cancelled && setObj(() => m.default)).catch(() => !cancelled && setDegraded(true));
    // Load on the first sign of use (scroll, pointer, key), or after a long quiet period. Keeps the scene off the critical
    // path of the first paint and interaction measurements; the scene reads the current scroll progress when it mounts.
    let loaded = false;
    const go = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(load, { timeout: 800 }); else load();
    };
    const evts = ["scroll", "pointermove", "keydown", "touchstart"] as const;
    const cleanup = () => { evts.forEach((e) => window.removeEventListener(e, go)); window.removeEventListener("load", arm); window.clearTimeout(timer); };
    const arm = () => { evts.forEach((e) => window.addEventListener(e, go, { passive: true, once: true })); timer = window.setTimeout(go, 6000); };
    if (document.readyState === "complete") arm(); else window.addEventListener("load", arm, { once: true });
    return () => { cancelled = true; cleanup(); };
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

  // Scroll to scene state. One normalized progress drives everything (no timers, no catch-up), so any scroll jump,
  // refresh mid-page or reverse scroll renders the correct state for that position directly.
  useEffect(() => {
    if (reduced) return;
    const track_ = wrap.current?.closest<HTMLElement>("[data-hero-track]");
    if (!track_) return;
    let raf = 0;
    let lastActive = -2;
    let on = false;
    const mods = () => (window.matchMedia("(max-width: 767px)").matches ? heroModulesMobile : heroModules);
    const apply = () => {
      raf = 0;
      const r = track_.getBoundingClientRect();
      const total = track_.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      const m = mods();
      const s = stateAt(p, m.length);
      Object.assign(bus.current, s);
      bus.current.invalidate?.();
      if (s.active !== lastActive) {
        lastActive = s.active;
        const mod = s.active >= 0 ? m[s.active] : null;
        if (capRef.current) {
          capRef.current.dataset.on = mod ? "true" : "false";
          capRef.current.textContent = "";
          if (mod) {
            const a = document.createElement("strong"); a.textContent = mod.name;
            const b = document.createElement("span"); b.textContent = mod.sub;
            capRef.current.append(a, b);
          }
        }
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; apply(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll, { passive: true }); }
      else if (!e.isIntersecting && on) { on = false; apply(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); }
    }, { rootMargin: "20% 0px 20% 0px" });
    io.observe(track_);
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
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
            <SceneBoundary onError={() => setDegraded(true)}>
            <Obj
              bus={bus.current}
              modules={modules}
              hovered={hovered}
              onHover={(i) => hover(i)}
              frameloop={visible ? "demand" : "never"}
              dpr={tier === "A" ? 1.5 : 1.1}
              lite={tier === "B"}
              onReady={() => setReady(true)}
              onDegrade={() => setDegraded(true)}
            />
            </SceneBoundary>
          </div>
        )}
      </div>
      <div ref={capRef} className="hero__cap" data-on="false" aria-hidden />
      <ul
        className={`module-list ${staticList ? "module-list--static" : ""}`}
        aria-label="StackEndBox capabilities"
      >
        {modules.map((m, i) => (
          <li key={m.name} data-active={hovered === i} style={{ ["--accent" as string]: m.accent }}>
            <div className="module-list__item" onPointerEnter={() => hover(i)} onPointerLeave={() => hover(null)}>
              <span className="module-list__name">{m.name}</span>
              <span className="module-list__sub">{m.sub}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
