"use client";
import { Bot, Database, Eye, FileText, Search, UserCheck, Wrench, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type NodeKey = "vision" | "docs" | "search" | "db" | "tools" | "approval";
export type NodeState = "idle" | "active" | "done" | "blocked";

/**
 * Two orbital planes around one AI core. Inner ring: the knowledge a model reads (retrieval, documents, data).
 * Outer ring: what it acts through (tools, vision, a person). Each ring keeps its three modules 120 degrees apart,
 * the rings travel at different periods (22s and 32s), and an outer module yields outward while it passes an inner
 * one, so no two modules ever sit on top of each other. Modules only translate: text is always upright.
 */
const NODES: { key: NodeKey; label: string; icon: LucideIcon; ring: 0 | 1; a: number }[] = [
  { key: "search", label: "Retrieval", icon: Search, ring: 0, a: -90 },
  { key: "docs", label: "Documents", icon: FileText, ring: 0, a: 30 },
  { key: "db", label: "Data", icon: Database, ring: 0, a: 150 },
  { key: "tools", label: "Tools", icon: Wrench, ring: 1, a: -30 },
  { key: "vision", label: "Vision", icon: Eye, ring: 1, a: 90 },
  { key: "approval", label: "Human approval", icon: UserCheck, ring: 1, a: 210 },
];
/** Ring radii as fractions of the stage (width, height), measured against a 580x480 design stage. */
const RX = [0.265, 0.425], RY = [0.235, 0.41];
/** Degrees per millisecond: inner 22s period, outer 32s period, same direction. */
const SPEED = [360 / 22000, 360 / 32000];
/** Module size at k = 1 (used for the yield test). */
const PW = 112, PH = 44;
const DESIGN_W = 580;
/** Stage scale: the orbit scales with its stage, but compact (phone) layouts keep labels at a readable size. */
const scaleFor = (w: number, compact: boolean) => (compact ? Math.min(1, Math.max(0.84, w / 400)) : Math.min(1.1, Math.max(0.62, w / DESIGN_W)));

/** Server-rendered positions on the design stage, so the orbit is spread out before the first measurement. */
const initial = (n: (typeof NODES)[number]): React.CSSProperties => {
  const th = (n.a * Math.PI) / 180, t = (Math.sin(th) + 1) / 2;
  return { ["--tx" as string]: `${(Math.cos(th) * RX[n.ring] * DESIGN_W).toFixed(1)}px`, ["--ty" as string]: `${(Math.sin(th) * RY[n.ring] * 480).toFixed(1)}px`, ["--sc" as string]: (0.86 + 0.16 * t).toFixed(3), ["--op" as string]: (0.58 + 0.42 * t).toFixed(2), zIndex: t > 0.5 ? 12 + Math.round(t * 8) : 2 + Math.round(t * 8) };
};

type Props = {
  docked: NodeKey | null;
  stateOf: (k: NodeKey) => NodeState;
  hub: string;
  busy: boolean;
  done: boolean;
  live: boolean;
  reduced: boolean;
  onPick: (k: NodeKey) => void;
};

export function AiOrbit({ docked, stateOf, hub, busy, done, live, reduced, onPick }: Props) {
  const plane = useRef<HTMLDivElement>(null);
  const els = useRef<Partial<Record<NodeKey, HTMLButtonElement | null>>>({});
  const beams = useRef<Partial<Record<NodeKey, SVGLineElement | null>>>({});
  const ang = useRef<Record<string, number>>(Object.fromEntries(NODES.map((n) => [n.key, n.a])));
  const yieldOff = useRef<Record<string, number>>({});
  const dockAmt = useRef<Record<string, number>>({});
  const size = useRef({ w: DESIGN_W, h: 480 });
  const [dim, setDim] = useState({ w: DESIGN_W, h: 480 });
  const [compact, setCompact] = useState(false);
  const loop = useRef({ raf: 0, last: 0, paused: false });
  const dockedRef = useRef(docked);
  dockedRef.current = docked;
  const compactRef = useRef(compact);
  compactRef.current = compact;
  // touch devices extend each module's tap area by a few px; keep that extension from touching a neighbour's
  // and a pill that keeps moving under a finger is hard to hit, so touch devices get the static ring at every width
  const coarseRef = useRef(false);
  const [coarse, setCoarse] = useState(false);
  useEffect(() => { const c = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches; coarseRef.current = c; setCoarse(c); }, []);
  const still = compact || coarse;
  const stillRef = useRef(still);
  stillRef.current = still;

  const paint = useCallback((dt = 0) => {
    const { w, h } = size.current;
    const k = scaleFor(w, compactRef.current);
    const cx = w / 2, cy = h / 2;
    const pos: Record<string, { x: number; y: number; t: number }> = {};
    // compact (phones): one static ring of six, evenly spaced, no orbit motion
    NODES.forEach((n, i) => {
      if (stillRef.current) {
        const th = ((-90 + i * 60) * Math.PI) / 180;
        pos[n.key] = { x: Math.cos(th) * w * 0.37, y: Math.sin(th) * h * 0.4, t: (Math.sin(th) + 1) / 2 };
        return;
      }
      const th = (ang.current[n.key] * Math.PI) / 180;
      pos[n.key] = { x: Math.cos(th) * RX[n.ring] * w, y: Math.sin(th) * RY[n.ring] * h, t: (Math.sin(th) + 1) / 2 };
    });
    // docking: the scenario's lead capability leaves its orbit and attaches above the core, then returns.
    // It travels in polar coordinates (angle and radius), so the path curves around the core instead of crossing it.
    const fin: Record<string, { x: number; y: number; depth: number; amt: number }> = {};
    NODES.forEach((n) => {
      const p = pos[n.key];
      const target = dockedRef.current === n.key ? 1 : 0;
      const cur = dockAmt.current[n.key] ?? 0;
      const amt = reduced || !dt ? target : cur + (target - cur) * Math.min(1, dt / 220);
      dockAmt.current[n.key] = amt;
      const r0 = Math.hypot(p.x, p.y), a0 = Math.atan2(p.y, p.x);
      const rd = (compactRef.current ? 82 : 64) * k + PH * 0.5 * k + 16, ad = -Math.PI / 2;
      let da = ad - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      const ra = r0 + (rd - r0) * amt, aa = a0 + da * amt;
      fin[n.key] = { x: amt ? Math.cos(aa) * ra : p.x, y: amt ? Math.sin(aa) * ra : p.y, depth: p.t + (1 - p.t) * amt, amt };
    });
    // No two modules may overlap. Priority: the docked module, then the inner ring, then the outer ring. A lower
    // priority module yields outward along its radius (smoothed), just enough to clear the ones above it.
    {
      const rank = (n: (typeof NODES)[number]) => (fin[n.key].amt > 0.05 ? 0 : 1 + n.ring);
      const order = [...NODES].sort((a, b) => rank(a) - rank(b));
      const placed: { x: number; y: number }[] = [];
      order.forEach((n) => {
        const f = fin[n.key];
        if (rank(n) === 0) { placed.push(f); return; }
        const len = Math.hypot(f.x, f.y) || 1;
        let need = 0;
        const maxPush = coarseRef.current ? 110 : 64;
        for (let push = 0; push <= maxPush; push += 4) {
          const x = f.x * (1 + push / len), y = f.y * (1 + push / len);
          need = push;
          const co = coarseRef.current; // coarse: the tap areas extend a fixed number of px (not scaled with k), so keep a fixed vertical gap
          const gx = co ? 12 : 10, rowH = co ? PH * k + 34 : (PH + 8) * k;
          if (!placed.some((q) => Math.abs(q.x - x) < (PW + gx) * k && Math.abs(q.y - y) < rowH)) break;
        }
        const cur = yieldOff.current[n.key] ?? 0;
        const next = dt && !reduced ? cur + (need - cur) * Math.min(1, dt / 160) : need;
        yieldOff.current[n.key] = next;
        f.x *= 1 + next / len; f.y *= 1 + next / len;
        placed.push(f);
      });
    }
    NODES.forEach((n) => {
      const el = els.current[n.key];
      if (!el) return;
      const { x, y, depth, amt } = fin[n.key];
      const p = pos[n.key];
      el.style.setProperty("--tx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ty", `${y.toFixed(1)}px`);
      // depth reads through scale and opacity; compact layouts keep every label full size
      el.style.setProperty("--sc", ((compactRef.current ? 1 : 0.86 + 0.16 * depth) * k).toFixed(3));
      el.style.setProperty("--op", (0.58 + 0.42 * depth).toFixed(2));
      el.style.zIndex = String(amt > 0.5 ? 30 : p.t > 0.5 ? 12 + Math.round(p.t * 8) : 2 + Math.round(p.t * 8));
      const ln = beams.current[n.key];
      if (ln) { ln.setAttribute("x1", String(cx)); ln.setAttribute("y1", String(cy)); ln.setAttribute("x2", (cx + x).toFixed(1)); ln.setAttribute("y2", (cy + y).toFixed(1)); }
    });
  }, [reduced]);

  // one rAF loop, only while the chapter is visible and motion is allowed
  useEffect(() => {
    const L = loop.current;
    if (!live || reduced || still) { cancelAnimationFrame(L.raf); L.raf = 0; paint(); return; }
    L.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - L.last); L.last = now;
      if (!L.paused) NODES.forEach((n) => { ang.current[n.key] += dt * SPEED[n.ring]; });
      paint(dt);
      L.raf = requestAnimationFrame(tick);
    };
    L.raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(L.raf); L.raf = 0; };
  }, [live, reduced, still, paint]);
  // docking changes repaint at once when no loop runs (reduced motion, compact)
  useEffect(() => { if (!loop.current.raf) paint(); }, [docked, still, paint]);

  useEffect(() => {
    const el = plane.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); size.current = { w: el.clientWidth || r.width, h: el.clientHeight || r.height }; setDim({ ...size.current }); setCompact(size.current.w < 420); paint(); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  const k = scaleFor(dim.w, compact);
  return (
    <div className="aorb" data-compact={compact} data-docked={docked ?? ""} onPointerEnter={() => { loop.current.paused = true; }} onPointerLeave={() => { loop.current.paused = false; }}>
      <div className="aorb__plane" ref={plane} style={{ ["--k" as string]: k.toFixed(3) }}>
        <svg className="aorb__rings" width={dim.w} height={dim.h} viewBox={`0 0 ${dim.w} ${dim.h}`} aria-hidden>
          <defs>
            <linearGradient id="aorb-ring" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(247,248,245,0.05)" />
              <stop offset="0.55" stopColor="rgba(247,248,245,0.2)" />
              <stop offset="1" stopColor="rgba(255,122,26,0.35)" />
            </linearGradient>
            <radialGradient id="aorb-glow"><stop offset="0" stopColor="rgba(47,210,122,0.16)" /><stop offset="1" stopColor="rgba(47,210,122,0)" /></radialGradient>
          </defs>
          <ellipse cx={dim.w / 2} cy={dim.h / 2} rx={dim.w * 0.2} ry={dim.h * 0.2} fill="url(#aorb-glow)" />
          {still
            ? <ellipse className="aorb__ring" cx={dim.w / 2} cy={dim.h / 2} rx={dim.w * 0.37} ry={dim.h * 0.4} />
            : [0, 1].map((r) => <ellipse key={r} className="aorb__ring" data-ring={r} cx={dim.w / 2} cy={dim.h / 2} rx={dim.w * RX[r]} ry={dim.h * RY[r]} />)}
          {NODES.map((n) => { const st = stateOf(n.key); return <line key={n.key} ref={(l) => { beams.current[n.key] = l; }} className="aorb__beam" data-st={docked && st !== "idle" ? st : "off"} />; })}
        </svg>
        <div className="aorb__core" data-done={done} data-busy={busy} aria-hidden>
          <Bot /><b>AI core</b><em className="mono">{hub}</em>
        </div>
        {NODES.map((n) => {
          const st = stateOf(n.key);
          return (
            <button key={n.key} ref={(el) => { els.current[n.key] = el; }} type="button" className="aorb__sat" style={initial(n)} data-ring={n.ring} data-st={st} data-docked={docked === n.key} aria-label={`${n.label}: run an example that uses it`} onClick={() => onPick(n.key)}>
              <span className="aorb__ic"><n.icon aria-hidden /></span><b>{n.label}</b><i className="aorb__dot" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
