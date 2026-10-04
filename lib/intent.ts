import type { Need } from "./briefOptions";
import { scrollToHash } from "./scrollToHash";

export type Capability = "product" | "ai" | "automation" | "crm" | "integrations" | "custom";

const KEY = "seb_intent";
const TTL = 7 * 24 * 60 * 60 * 1000;

export function saveIntent(capability: Capability) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ capability, ts: Date.now() }));
    window.dispatchEvent(new CustomEvent("seb:intent", { detail: capability }));
  } catch {
    /* storage unavailable */
  }
}

export function readIntent(): Capability | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { capability, ts } = JSON.parse(raw) as { capability: Capability; ts: number };
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(KEY);
      return null;
    }
    return capability;
  } catch {
    return null;
  }
}

/** Maps a capability to the Builder first answer. */
export const intentNeed: Record<Capability, Need> = {
  product: "SaaS / MVP",
  ai: "AI System",
  automation: "Automation",
  crm: "CRM / Internal Tool",
  integrations: "API / Integration",
  custom: "Custom Software",
};

/** Maps a need back to a capability so contextual CTAs can remember intent. */
export const needCapability: Record<Need, Capability> = {
  "SaaS / MVP": "product",
  "Web Application": "product",
  "AI System": "ai",
  Automation: "automation",
  "CRM / Internal Tool": "crm",
  "API / Integration": "integrations",
  "Custom Software": "custom",
  "Web3 / Blockchain": "custom",
  "Trading / Data Platform": "custom",
  "Not sure": "custom",
};

type Navish = { preventDefault: () => void } | undefined;

/**
 * One reliable path from any CTA to the project brief. Records the intent, preselects the category,
 * scrolls to #start (re-checking the position once layout has settled), updates the hash and focuses the
 * brief field. Callers keep a real href="/#start" so it still works without JavaScript.
 */
export function goToBuilder(e: Navish, need?: Need, stage?: string, source?: string) {
  try {
    if (need) {
      window.dispatchEvent(new CustomEvent("seb:builder-preset", { detail: { need, stage, source } }));
      saveIntent(needCapability[need]);
    }
    if (!document.getElementById("start")) return; // let the browser follow the href
    e?.preventDefault();
    scrollToHash("start", { focus: true });
  } catch {}
}

/** Backwards compatible: preselect only. */
export function presetBuilder(need: Need, stage?: string) {
  try {
    window.dispatchEvent(new CustomEvent("seb:builder-preset", { detail: { need, stage } }));
    saveIntent(needCapability[need]);
  } catch {}
}
