"use client";
import { useRef } from "react";
import { useInView } from "@/lib/hooks";

/**
 * Reusable seam between two chapters. It owns timing only (enter once, then rest, no fixed/sticky state left behind);
 * each `type` draws its own small handoff so transitions stay different without being random.
 * Transform and opacity only. Reduced motion shows the resolved state through CSS.
 */
export type BoundaryType =
  | "handoff" | "compress" | "expand" | "depth" | "fragment" | "awaken" | "morph"
  | "continuity" | "flatten" | "recompress" | "light" | "focus" | "brand";

export function ChapterBoundary({ type }: { type: BoundaryType }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, "0px 0px -15% 0px", true);
  return (
    <div className="cb" ref={ref} data-type={type} data-state={seen ? "in" : "idle"} aria-hidden>
      <div className="cb__in"><i /><i /><i /><i /><i /></div>
    </div>
  );
}
