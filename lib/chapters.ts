import { useSyncExternalStore } from "react";

/**
 * Chapter runtime: the one place that knows which homepage chapter is active.
 *
 * - One passive scroll listener and at most one rAF per frame while scrolling (no loop when idle).
 * - Each chapter section gets `--enter` (0..1 as it opens) and `--exit` (0..1 as it leaves) so a chapter can
 *   draw its own hand-off from the same number. These are derived from scroll position, never from timers.
 * - `state` is "active" (most visible), "near" (within one viewport) or "far". Heavy scenes run only when
 *   active/near and park when far. A hidden tab parks everything.
 * - A single pointer engine writes `--px/--py/--mx/--my` onto the ACTIVE chapter only.
 */
export type ChapterState = "active" | "near" | "far";
export type MotionPhase = "idle" | "active" | "exited";
export type Dir = "down" | "up";

/**
 * Re-entrant motion model, shared by every chapter (one scroll loop, one rAF):
 * - `progress` 0..1 is derived from scroll position only, so moving forward plays a scene and moving backward reverses it.
 *   Sections marked data-scroll="pin" (taller than the viewport, with a sticky stage) use their runway; others use a
 *   pass-through range while they cross the viewport.
 * - `cycle` increments every time a chapter is re-entered after being far away, so entrance choreography replays.
 * - `phase` is idle (not reached yet), active, or exited (scrolled past). `dir` is the scroll direction at the last entry.
 * The same values are written as data-motion / data-dir / data-cycle / --p attributes for CSS and tests.
 */
type Item = { el: HTMLElement; state: ChapterState; enter: number; exit: number; p: number; cycle: number; phase: MotionPhase; dir: Dir };
const items = new Map<string, Item>();
const subs = new Set<() => void>();
let active = "";
let version = 0;
let raf = 0;
let started = false;
let pageVisible = true;
let reducedFlag = false;
let lastY = 0;
let dir: Dir = "down";
let resumed = false; // set when a hidden tab becomes visible: returning is not a re-entry

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const emit = () => { version++; subs.forEach((f) => f()); };

function progressOf(el: HTMLElement, r: DOMRect, vh: number) {
  const h = r.height;
  if (el.dataset.scroll === "pin" && h > vh * 1.2) return clamp(-r.top / (h - vh));
  return clamp((vh * 0.72 - r.top) / Math.max(1, h * 0.78));
}

function measure() {
  raf = 0;
  const vh = window.innerHeight;
  const y = window.scrollY;
  if (y !== lastY) { dir = y > lastY ? "down" : "up"; lastY = y; }
  let best = "";
  let bestVis = -1;
  let changed = false;
  items.forEach((it, id) => {
    const r = it.el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (visible > bestVis) { bestVis = visible; best = id; }
    const enter = clamp((vh - r.top) / (vh * 0.62));
    const exit = clamp(1 - r.bottom / (vh * 0.5));
    const away = r.top > vh * 1.4 || r.bottom < -vh * 0.4;
    const prevState = it.state;
    it.state = !pageVisible ? "far" : away ? "far" : prevState === "active" ? "active" : "near";
    // re-entry: far (by scrolling, not by a hidden tab) to near counts as a new visit
    if (pageVisible && !resumed && prevState === "far" && it.state !== "far") { it.cycle += 1; it.dir = dir; it.el.dataset.cycle = String(it.cycle); it.el.dataset.dir = dir; changed = true; }
    const phase: MotionPhase = r.top > vh ? "idle" : r.bottom < 0 ? "exited" : "active";
    if (phase !== it.phase) { it.phase = phase; it.el.dataset.motion = phase; changed = true; }
    if (Math.abs(enter - it.enter) > 0.004 || Math.abs(exit - it.exit) > 0.004) {
      it.enter = enter; it.exit = exit;
      it.el.style.setProperty("--enter", enter.toFixed(3));
      it.el.style.setProperty("--exit", exit.toFixed(3));
    }
    const p = progressOf(it.el, r, vh);
    if (Math.abs(p - it.p) > 0.002) { it.p = p; it.el.style.setProperty("--p", p.toFixed(3)); changed = true; }
  });
  if (!pageVisible) best = "";
  if (best !== active) {
    const prev = items.get(active);
    if (prev) { prev.el.style.setProperty("--px", "0"); prev.el.style.setProperty("--py", "0"); prev.el.removeAttribute("data-active"); }
    active = best;
    const it = items.get(best);
    if (it) { it.el.setAttribute("data-active", "true"); it.state = "active"; }
    items.forEach((x, k) => { if (k !== best && x.state === "active") x.state = "near"; });
    changed = true;
  }
  items.forEach((it) => { if (it.el.dataset.chapter !== it.state) { it.el.dataset.chapter = it.state; changed = true; } });
  resumed = false;
  if (changed) emit();
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };

export function startChapters(): () => void {
  if (started) return () => {};
  started = true;
  reducedFlag = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
  lastY = window.scrollY;
  document.querySelectorAll<HTMLElement>("main > section[id]").forEach((el) => items.set(el.id, { el, state: "far", enter: -1, exit: -1, p: -1, cycle: 0, phase: "idle", dir: "down" }));
  pageVisible = document.visibilityState !== "hidden";
  const onVis = () => { const v = document.visibilityState !== "hidden"; if (v && !pageVisible) resumed = true; pageVisible = v; schedule(); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  const onShow = (e: PageTransitionEvent) => { if (e.persisted) { lastY = window.scrollY; schedule(); } };
  window.addEventListener("pageshow", onShow);
  const ro = new ResizeObserver(schedule);
  ro.observe(document.body);
  schedule();
  return () => {
    started = false;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pageshow", onShow);
    ro.disconnect();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    items.clear();
    active = "";
  };
}

export const isReducedFlag = () => reducedFlag;
export const getActiveChapter = () => active;
export function chapterState(id: string): ChapterState { return items.get(id)?.state ?? "near"; }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** "active" | "near" | "far" for a chapter id. Before the runtime starts (SSR, first render) a chapter counts as "near". */
export function useChapterState(id: string): ChapterState {
  return useSyncExternalStore(subscribe, () => { void version; return chapterState(id); }, () => "near");
}
export const useChapterRunning = (id: string) => useChapterState(id) !== "far";

/** Scroll progress mapped to a discrete step 0..steps-1. Re-renders only when the step changes. Before start: `initial`. */
export function useChapterStep(id: string, steps: number, initial = 0): number {
  return useSyncExternalStore(subscribe, () => { void version; const it = items.get(id); return !it || it.p < 0 ? initial : Math.min(steps - 1, Math.floor(it.p * steps)); }, () => initial);
}
/** Continuous progress 0..1 (re-renders on every change; use for small trees only). */
export function useChapterProgress(id: string): number {
  return useSyncExternalStore(subscribe, () => { void version; const it = items.get(id); return !it || it.p < 0 ? 0 : Math.round(it.p * 200) / 200; }, () => 0);
}
/** Visit counter: increments on each re-entry (used to key entrance choreography so it replays). */
export function useChapterCycle(id: string): number {
  return useSyncExternalStore(subscribe, () => { void version; return items.get(id)?.cycle ?? 0; }, () => 0);
}
export function chapterDir(id: string): Dir { return items.get(id)?.dir ?? "down"; }

/* ---------- pointer engine ---------- */
type PointerFn = (x: number, y: number, chapter: string) => void;
const pointerSubs = new Set<PointerFn>();
export function onPointer(fn: PointerFn): () => void { pointerSubs.add(fn); return () => { pointerSubs.delete(fn); }; }
export function pointerEnabled() {
  return !reducedFlag && window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= 1024;
}

export function startPointer(): () => void {
  if (!pointerEnabled()) return () => {};
  let x = 0, y = 0, pr = 0;
  const flush = () => {
    pr = 0;
    const it = items.get(active);
    if (!it) return;
    const r = it.el.getBoundingClientRect();
    if (y < r.top || y > r.bottom) return;
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    it.el.style.setProperty("--px", (((x - r.left) / w) * 2 - 1).toFixed(3));
    it.el.style.setProperty("--py", (((y - r.top) / h) * 2 - 1).toFixed(3));
    it.el.style.setProperty("--mx", `${Math.round(x - r.left)}px`);
    it.el.style.setProperty("--my", `${Math.round(y - r.top)}px`);
    pointerSubs.forEach((f) => f(x, y, active));
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!pr) pr = requestAnimationFrame(flush);
  };
  window.addEventListener("pointermove", move, { passive: true });
  return () => { window.removeEventListener("pointermove", move); if (pr) cancelAnimationFrame(pr); };
}
