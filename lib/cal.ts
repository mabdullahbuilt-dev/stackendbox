import { siteConfig } from "@/site.config";

/** Cal.com popup, initialised lazily on the first scheduling interaction. Falls back to a new tab. */
type CalFn = ((...a: unknown[]) => void) & { ns?: Record<string, (...a: unknown[]) => void>; loaded?: boolean; q?: unknown[] };
declare global {
  interface Window {
    Cal?: CalFn;
  }
}

const EMBED = "https://app.cal.com/embed/embed.js";

export function calParts() {
  const raw = siteConfig.calUrl;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const link = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!link) return null;
    const namespace = link.split("/").pop() as string;
    return { url: raw, link, namespace };
  } catch {
    return null;
  }
}

let ready: Promise<boolean> | null = null;

function load(ns: string): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise<boolean>((resolve) => {
    try {
      // Standard Cal.com queue bootstrap, so calls made before the script loads are replayed.
      const w = window;
      const p = (a: { q?: unknown[] }, ar: unknown) => { (a.q = a.q || []).push(ar); };
      w.Cal =
        w.Cal ||
        (function (...args: unknown[]) {
          const cal = w.Cal as CalFn;
          if (args[0] === "init" && typeof args[1] === "string") {
            cal.ns = cal.ns || {};
            const api = function (...a: unknown[]) { p(api as { q?: unknown[] }, a); } as unknown as (...a: unknown[]) => void;
            cal.ns[args[1]] = cal.ns[args[1]] || api;
            p(cal.ns[args[1]] as { q?: unknown[] }, args);
            p(cal, ["initNamespace", args[1]]);
            return;
          }
          p(cal, args);
        } as CalFn);
      const s = document.createElement("script");
      s.src = EMBED;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      w.Cal("init", ns, { origin: "https://app.cal.com" });
      const api = w.Cal.ns?.[ns];
      api?.("ui", { hideEventTypeDetails: false, layout: "month_view" });
      setTimeout(() => resolve(!!(w.Cal && w.Cal.loaded) || false), 6000);
    } catch {
      resolve(false);
    }
  });
  return ready;
}

/** Warm the embed on hover or focus so the click feels immediate. */
export function prepareCal() {
  const c = calParts();
  if (c) void load(c.namespace);
}

/** Opens the booking popup. If Cal cannot initialise, opens the event page in a new tab. */
export async function openCal() {
  const c = calParts();
  if (!c) return;
  const ok = await load(c.namespace);
  const api = window.Cal?.ns?.[c.namespace];
  if (!ok || !api) {
    window.open(c.url, "_blank", "noopener,noreferrer");
    return;
  }
  api("modal", { calLink: c.link, config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" } });
}
