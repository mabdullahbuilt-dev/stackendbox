"use client";
import { useEffect, useState } from "react";

/**
 * Tiny scripted-timeline state machine for demo scenes.
 * `times` = ms offsets at which step k begins (times[0] should be 0).
 * Not playing (inactive / offscreen) or reduced motion gives the final frame.
 */
export function useSteps(times: number[], playing: boolean, reduced: boolean, hold = 2600) {
  const last = times.length - 1;
  const [step, setStep] = useState(last);
  useEffect(() => {
    if (!playing || reduced) {
      setStep(last);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setStep(0);
      timers = times.slice(1).map((t, i) => setTimeout(() => setStep(i + 1), t));
      timers.push(setTimeout(run, times[last] + hold));
    };
    run();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reduced]);
  return step;
}

/** Animates a number toward `target` over `ms` (rAF). Instant when reduced. */
export function useCount(target: number, ms: number, reduced: boolean) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (reduced) {
      setV(target);
      return;
    }
    let raf = 0;
    let from = 0;
    setV((cur) => (from = cur));
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return v;
}
