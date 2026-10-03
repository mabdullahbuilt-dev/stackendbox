/**
 * Loads GSAP + ScrollTrigger once, after the page has finished loading and the main thread is idle.
 * Keeps first paint and hydration free of animation-library parse/compile work.
 */
type G = { gsap: typeof import("gsap").gsap; ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger };
let cached: Promise<G> | null = null;

export function loadGsap(): Promise<G> {
  if (cached) return cached;
  cached = new Promise<G>((resolve) => {
    const go = () =>
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, s]) => {
        g.gsap.registerPlugin(s.ScrollTrigger);
        resolve({ gsap: g.gsap, ScrollTrigger: s.ScrollTrigger });
      });
    const idle = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(go, { timeout: 1200 });
      else setTimeout(go, 250);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", () => setTimeout(idle, 100), { once: true });
  });
  return cached;
}
