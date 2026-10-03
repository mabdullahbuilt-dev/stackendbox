import { siteConfig } from "@/site.config";

export type AnalyticsEvent =
  | "hero_cta_primary_click"
  | "hero_cta_secondary_click"
  | "nav_cta_click"
  | "nav_link_click"
  | "hero_module_hover"
  | "hero_module_focus"
  | "capability_select"
  | "capability_intent_cta_click"
  | "proof_card_view"
  | "proof_interaction"
  | "scene_complete"
  | "scene_replay"
  | "project_view_click"
  | "builder_start"
  | "builder_step_complete"
  | "builder_complete"
  | "builder_submit"
  | "builder_error"
  | "schedule_call_click"
  | "contact_submit_success"
  | "motion_toggle"
  | "scroll_depth";

type Params = Record<string, string | number | boolean | undefined>;

const deviceClass = () => {
  const w = window.innerWidth;
  return w >= 1024 ? "desktop" : w >= 600 ? "tablet" : "mobile";
};

/** Typed analytics wrapper. No-ops until NEXT_PUBLIC_ANALYTICS_ENDPOINT is configured. Never send PII. */
export function track(event: AnalyticsEvent, params: Params = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    ...params,
    device: deviceClass(),
    reduced_motion: document.documentElement.dataset.motion === "reduced",
    path: location.pathname,
  };
  window.dispatchEvent(new CustomEvent("seb:track", { detail: payload }));
  const endpoint = siteConfig.analyticsEndpoint;
  if (!endpoint) return;
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
    else void fetch(endpoint, { method: "POST", body, keepalive: true });
  } catch {
    /* analytics must never break the page */
  }
}
