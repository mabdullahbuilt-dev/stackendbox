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

type Item = { el: HTMLElement; state: ChapterState; enter: number; exit: number };
const items = new Map<string, Item>();
const subs = new Set<() => void>();
let active = "";
let version = 0;
let raf = 0;
let started = false;
let pageVisible = true;
let reducedFlag = false;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const emit = () => { version++; subs.forEach((f) => f()); };

function measure() {
  raf = 0;
  const vh = window.innerHeight;
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
    const near = r.top > vh * 1.4 ? false : r.bottom >= -vh * 0.4;
    it.state = !pageVisible || away ? "far" : near ? (it.state === "active" ? "active" : "near") : "far";
    if (Math.abs(enter - it.enter) > 0.004 || Math.abs(exit - it.exit) > 0.004) {
      it.enter = enter; it.exit = exit;
      it.el.style.setProperty("--enter", enter.toFixed(3));
      it.el.style.setProperty("--exit", exit.toFixed(3));
    }
  });
  if (!pageVisible) best = "";
  if (best !== active) {
    const prev = items.get(active);
    if (prev) { prev.el.style.setProperty("--px", "0"); prev.el.style.setProperty("--py", "0"); prev.el.removeAttribute("data-active"); }
    active = best;
    items.get(best)?.el.setAttribute("data-active", "true");
    changed = true;
  }
  items.forEach((it) => { if (it.el.dataset.chapter !== it.state) { it.el.dataset.chapter = it.state; changed = true; } });
  if (changed) emit();
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };

export function startChapters(): () => void {
  if (started) return () => {};
  started = true;
  reducedFlag = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
  document.querySelectorAll<HTMLElement>("main > section[id]").forEach((el) => items.set(el.id, { el, state: "far", enter: -1, exit: -1 }));
  pageVisible = document.visibilityState !== "hidden";
  const onVis = () => { pageVisible = document.visibilityState !== "hidden"; schedule(); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(schedule);
  ro.observe(document.body);
  schedule();
  return () => {
    started = false;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", onVis);
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
