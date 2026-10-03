"use client";
import { useMotionPreference } from "@/lib/useMotionPreference";

export function MotionToggle() {
  const { userReduced, setUserReduced, reduced } = useMotionPreference();
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        className="sr-only"
        checked={reduced}
        disabled={reduced && !userReduced}
        onChange={(e) => setUserReduced(e.target.checked)}
      />
      <span className="switch__track" aria-hidden>
        <i />
      </span>
      <span>Reduce motion</span>
    </label>
  );
}
