import { siteConfig } from "@/site.config";

export type AnalyticsEvent =
  | "hero_start_project"
  | "hero_view_work"
  | "hero_module_hover"
  | "hero_module_focus"
  | "nav_cta_click"
  | "nav_link_click"
  | "service_selected"
  | "intent_selected"
  | "transformation_selected"
  | "lab_opened"
  | "project_opened"
  | "integration_selected"
  | "mvp_cta"
  | "ai_cta"
  | "cta_click"
  | "scene_complete"
  | "scene_replay"
  | "builder_started"
  | "builder_step_completed"
  | "builder_submitted"
  | "builder_error"
  | "contact_clicked"
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
