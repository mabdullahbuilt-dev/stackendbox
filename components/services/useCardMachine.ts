"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { acquire } from "@/lib/playQueue";

/**
 * Deterministic card animation: idle > entering > active > settling > settled.
 * One interval at a time (a new run cancels the previous one), the slot in the shared queue is always released,
 * and leaving the card or the viewport finishes quickly instead of locking. Resting value is `total` (final scene).
 */
export type Phase = "idle" | "entering" | "active" | "settling" | "settled";

export function useCardMachine(total: number, reduced: boolean) {
  const [n, setN] = useState(total);
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const cancelQ = useRef<(() => void) | undefined>(undefined);
  const releaseRef = useRef<(() => void) | undefined>(undefined);
  const nRef = useRef(total);
  const running = useRef(false);

  const set = (v: number) => { nRef.current = v; setN(v); };
  const stop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = undefined;
    cancelQ.current?.();
    cancelQ.current = undefined;
    releaseRef.current = undefined;
    running.current = false;
  }, []);

  const step = useCallback((ms: number, release: () => void) => {
    clearInterval(timer.current);
    releaseRef.current = release;
    timer.current = setInterval(() => {
      const next = nRef.current + 1;
      set(Math.min(total, next));
      if (next >= total) {
        clearInterval(timer.current);
        timer.current = undefined;
        running.current = false;
        setPhase("settling");
        setTimeout(() => setPhase((p) => (p === "settling" ? "settled" : p)), 220);
        release();
      }
    }, ms);
  }, [total]);

  /** kind "full" runs the whole script from the start; "short" replays the last three steps. */
  const run = useCallback((kind: "full" | "short") => {
    if (reduced) { stop(); set(total); setPhase("settled"); return; }
    stop();
    running.current = true;
    setPhase(kind === "full" ? "entering" : "active");
    if (kind === "short") {
      set(Math.max(0, total - 3));
      step(230, () => {});
      return;
    }
    cancelQ.current = acquire((release) => {
      set(0);
      setPhase("active");
      step(520, release);
    });
  }, [reduced, total, stop, step]);

  /** Leaving mid-play: finish quickly rather than freezing half way. */
  const finish = useCallback(() => {
    if (!running.current) return;
    const release = releaseRef.current ?? (() => {});
    if (nRef.current >= total) return;
    step(70, release);
  }, [step, total]);

  /** Off screen: jump to the final scene and free the slot. */
  const park = useCallback(() => {
    if (!running.current && !cancelQ.current) return;
    stop();
    set(total);
    setPhase("settled");
  }, [stop, total]);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => { if (reduced) { stop(); set(total); setPhase("settled"); } }, [reduced, total, stop]);

  return { n, phase, run, finish, park, busy: phase === "entering" || phase === "active" };
}
