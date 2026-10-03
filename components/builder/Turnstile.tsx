"use client";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/site.config";

type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global {
  interface Window {
    turnstile?: TS;
  }
}

/** Cloudflare Turnstile. Renders nothing (and loads nothing) unless a site key is configured. */
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const key = siteConfig.turnstileSiteKey;
  useEffect(() => {
    if (!key || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile) return;
      id = window.turnstile.render(box.current, { sitekey: key, theme: "dark", callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    };
    if (window.turnstile) mount();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [key, onToken]);
  if (!key) return null;
  return <div ref={box} className="turnstile" />;
}
