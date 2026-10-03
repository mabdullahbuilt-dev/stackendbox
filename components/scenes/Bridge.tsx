"use client";
import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { loadGsap } from "@/lib/gsap";
import { useMotionPreference } from "@/lib/useMotionPreference";

/** Quiet bridge: one sentence, word-by-word opacity on scroll (no blur, no rotation). */
export function Bridge() {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLParagraphElement>(null);
  const words = copy.bridge.split(" ");

  useEffect(() => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    let kill: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const w = el.querySelectorAll(".bridge__w");
        gsap.set(w, { opacity: 0.18 });
        gsap.to(w, {
          opacity: 1,
          ease: "none",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
        });
      }, el);
      kill = () => ctx.revert();
    })();
    return () => { cancelled = true; kill?.(); };
  }, [reduced]);

  return (
    <div id="bridge" className="bridge">
      <p ref={ref} className="bridge__p">
        <span className="sr-only">{copy.bridge}</span>
        <span aria-hidden>{words.map((w, i) => <span key={i} className="bridge__w">{w}{" "}</span>)}</span>
      </p>
    </div>
  );
}
