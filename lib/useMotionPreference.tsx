"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { track } from "./analytics";

type Ctx = { reduced: boolean; setUserReduced: (v: boolean) => void; userReduced: boolean };
const MotionCtx = createContext<Ctx>({ reduced: false, userReduced: false, setUserReduced: () => {} });

const KEY = "seb_motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystem] = useState(false);
  const [user, setUser] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(mq.matches);
    const on = () => setSystem(mq.matches);
    mq.addEventListener("change", on);
    try {
      setUser(localStorage.getItem(KEY) === "reduced");
    } catch {}
    return () => mq.removeEventListener("change", on);
  }, []);

  const reduced = system || user;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);

  const setUserReduced = useCallback((v: boolean) => {
    setUser(v);
    try {
      localStorage.setItem(KEY, v ? "reduced" : "full");
    } catch {}
    track("motion_toggle", { state: v ? "reduced" : "full" });
  }, []);

  const value = useMemo(() => ({ reduced, userReduced: user, setUserReduced }), [reduced, user, setUserReduced]);
  return <MotionCtx.Provider value={value}>{children}</MotionCtx.Provider>;
}

export const useMotionPreference = () => useContext(MotionCtx);
