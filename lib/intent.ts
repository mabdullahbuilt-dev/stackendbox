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

export const intentCta: Record<Capability, string> = {
  product: "Discuss a Product Build",
  ai: "Discuss an AI Build",
  automation: "Discuss an Automation",
  crm: "Discuss Your System",
  integrations: "Discuss an Integration",
  custom: "Describe It",
};

/** Maps a capability to the demo to show first in the Proof Stage. */
export const intentDemo: Record<Capability, string> = {
  product: "launchkit",
  ai: "supportgrid",
  automation: "leados",
  crm: "leados",
  integrations: "connecthub",
  custom: "opsboard",
};

/** Maps a capability to the Builder Q1 option. */
export const intentNeed: Record<Capability, string> = {
  product: "Product",
  ai: "AI",
  automation: "Automation",
  crm: "CRM",
  integrations: "Integration",
  custom: "Something else",
};

/** Ask the Builder to preselect a need (used by CTAs outside the Builder). */
export function presetBuilder(need: string) {
  try {
    window.dispatchEvent(new CustomEvent("seb:builder-preset", { detail: need }));
  } catch {}
}
