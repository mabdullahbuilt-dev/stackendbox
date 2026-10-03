"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** true while the element intersects the viewport (with optional margin). */
export function useInView<T extends Element>(ref: RefObject<T | null>, margin = "0px", once = false) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (once && e.isIntersecting) io.disconnect();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, once]);
  return inView;
}

/** Subscribes to a media query. Returns `fallback` during SSR/first render. */
export function useMedia(query: string, fallback = false) {
  const [m, setM] = useState(fallback);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Returns a stable ref that always holds the latest value. */
export function useLatest<T>(value: T) {
  const r = useRef(value);
  r.current = value;
  return r;
}
