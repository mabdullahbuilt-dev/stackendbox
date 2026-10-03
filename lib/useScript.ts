"use client";
import { useEffect, useState } from "react";

/**
 * Plays steps 0..total once, `ms` apart, when `run` is true, then rests on `total`.
 * Reduced motion jumps straight to the finished state. Changing `key` replays.
 */
export function useScript(total: number, ms: number, run: boolean, reduced: boolean, key: string | number = 0) {
  const [step, setStep] = useState(reduced ? total : 0);
  useEffect(() => {
    if (reduced) { setStep(total); return; }
    setStep(0);
    if (!run) return;
    let k = 0;
    const id = setInterval(() => { k += 1; setStep(k); if (k >= total) clearInterval(id); }, ms);
    return () => clearInterval(id);
  }, [run, reduced, total, ms, key]);
  return step;
}
