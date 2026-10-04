/**
 * Device performance tier for heavy visuals.
 * A: powerful desktop, full 3D. B: moderate desktop or tablet, lighter 3D. C: phones, save-data, low memory: poster only.
 */
export type Tier = "A" | "B" | "C";

export function perfTier(): Tier {
  if (typeof window === "undefined") return "C";
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData === true) return "C";
  if (window.matchMedia("(max-width: 767px)").matches) return "C";
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches && window.innerWidth < 1100) return "C";
  const mem = n.deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem !== undefined && mem <= 2) return "C";
  if ((mem !== undefined && mem <= 4) || cores <= 4) return "B";
  return "A";
}
