/**
 * Loads GSAP + ScrollTrigger once, after the page has finished loading and the main thread is idle.
 * Keeps first paint and hydration free of animation-library parse/compile work.
 */
type G = { gsap: typeof import("gsap").gsap; ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger };
let cached: Promise<G> | null = null;

export function loadGsap(): Promise<G> {
  if (cached) return cached;
  cached = new Promise<G>((resolve) => {
    const go = () => {
      // Pinned scenes measure the whole document, so render every section at its real height first.
      document.documentElement.setAttribute("data-cv", "off");
      return Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, s]) => {
        g.gsap.registerPlugin(s.ScrollTrigger);
        resolve({ gsap: g.gsap, ScrollTrigger: s.ScrollTrigger });
      });
    };
    // Wait for the first real interaction (or a long idle) so animation code never competes with first paint.
    // A deep link (#hash) loads immediately because the visitor may land inside a pinned scene.
    const events = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "keydown"] as const;
    let started = false;
    const off = () => { events.forEach((e) => window.removeEventListener(e, start)); clearTimeout(fallback); };
    const start = () => { if (started) return; started = true; off(); go(); };
    const fallback = window.setTimeout(start, 7000);
    const arm = () => {
      if (location.hash.length > 1) { start(); return; }
      events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
  });
  return cached;
}
