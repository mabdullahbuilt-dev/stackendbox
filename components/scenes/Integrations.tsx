"use client";
import { BarChart3, Calendar, Cpu, CreditCard, Database, Mail, MessageSquare, RotateCcw, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { Pill } from "@/components/ui/mock";

const TILES: { icon: LucideIcon; label: string; cap: string; s: [number, number, number] }[] = [
  { icon: CreditCard, label: "PAYMENTS", cap: "payments · webhooks · reconciliation", s: [-34, -16, -3] },
  { icon: Users, label: "CRM", cap: "contacts · pipeline · sync", s: [-26, 40, 4] },
  { icon: Calendar, label: "CALENDAR", cap: "availability · bookings · reminders", s: [6, -44, -2] },
  { icon: Mail, label: "EMAIL", cap: "transactional · sequences", s: [34, -20, 3] },
  { icon: MessageSquare, label: "MESSAGING", cap: "chat · notifications · bots", s: [-36, 4, 2] },
  { icon: Database, label: "DATABASE", cap: "schemas · sync · backups", s: [30, 42, -4] },
  { icon: BarChart3, label: "ANALYTICS", cap: "events · dashboards", s: [38, 6, -2] },
  { icon: Cpu, label: "AI", cap: "models · agents · retrieval", s: [4, 46, 3] },
];

export function Integrations() {
  const { reduced } = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState("");
  const played = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = root.current;
    if (!mounted || reduced || !el) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const compact = window.matchMedia("(max-width: 599px)").matches;
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(el);
        const tiles = q<HTMLElement>(".ix-tile");
        const slots = q<HTMLElement>(".ix-slot");
        const rows = q<HTMLElement>(".ix-ev");
        gsap.set(tiles, { x: 0, y: 0, rotation: 0 });
        const panel = el.getBoundingClientRect();
        tiles.forEach((t, i) => {
          const r = slots[i].getBoundingClientRect();
          const s = TILES[i].s;
          const cx = r.left + r.width / 2 - panel.left;
          const cy = r.top + r.height / 2 - panel.top;
          const tx = panel.width / 2 + (s[0] / 100) * panel.width;
          const ty = panel.height / 2 + (s[1] / 100) * panel.height;
          gsap.set(t, { x: tx - cx, y: ty - cy, rotation: s[2], scale: 1.04 });
        });
        gsap.set(q(".ix-chrome"), { opacity: 0 });
        gsap.set(rows, { opacity: 0, y: 14 });
        gsap.set(q(".ix-dot"), { backgroundColor: "#FFB454" });
        gsap.set(q(".ix-state"), { opacity: 0 });
        gsap.set(q(".ix-slot"), { borderStyle: "dashed" });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
        tlRef.current = tl;
        const D = compact ? 1.4 : 2.2;
        const u = D / 100;
        tl.to(tiles, { x: 0, y: 0, rotation: 0, scale: 1, duration: 40 * u, stagger: 4 * u, ease: "power2.inOut" }, 15 * u);
        tl.set(q(".ix-slot"), { borderStyle: "solid" }, 56 * u);
        tl.to(q(".ix-chrome"), { opacity: 1, duration: 8 * u }, 55 * u);
        rows.forEach((row, i) => {
          const at = (65 + i * 5) * u;
          tl.to(row, { opacity: 1, y: 0, duration: 6 * u }, at);
          tl.to(row.querySelector(".ix-dot"), { backgroundColor: "#38D39F", duration: 4 * u, ease: "none" }, at + 7 * u);
          tl.to(row.querySelector(".ix-pill-a"), { opacity: 0, duration: 2 * u }, at + 7 * u);
          tl.to(row.querySelector(".ix-pill-b"), { opacity: 1, duration: 2 * u }, at + 8 * u);
        });
        tl.to(q(".ix-state"), { opacity: 1, duration: 4 * u }, 95 * u);
        tl.call(() => { setDone(true); if (played.current) setAnnounce("All connected."); }, undefined, D);
        tl.to({}, { duration: 0 }, D);

        const io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting && !played.current) {
            played.current = true;
            tl.play(0);
            track("scene_complete", { scene: "integrations" });
          }
        }, { threshold: 0.5 });
        io.observe(el);
        cleanup = () => io.disconnect();
      }, el);
      const prev = cleanup;
      cleanup = () => { prev?.(); tlRef.current = null; ctx.revert(); };
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [mounted, reduced]);

  const replay = useCallback(() => {
    played.current = true;
    setDone(false);
    setAnnounce("Replaying connection sequence.");
    track("scene_replay", { scene: "integrations" });
    tlRef.current?.restart();
  }, []);

  const staticFinal = !mounted || reduced;

  return (
    <section id="integrations" className="section ix-sec" aria-labelledby="int-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.integrations.eyebrow}</p>
          <h2 id="int-title" className="h2">{copy.integrations.title}</h2>
          <p className="body-l">{copy.integrations.support}</p>
        </Reveal>

        <div className="ix" ref={root} data-static={staticFinal} aria-hidden>
          <div className="ix-hub">
            <div className="ix-chrome" />
            <div className="ix-hub__bar mono"><span>ONE SYSTEM</span><span className="ix-state"><Pill tone="green">ALL CONNECTED</Pill></span></div>
            <div className="ix-hub__body">
              <div className="ix-slots">
                {TILES.map((t) => (
                  <div key={t.label} className="ix-slot">
                    <div className="ix-tile">
                      <t.icon />
                      <span className="mono">{t.label}</span>
                      <span className="ix-tile__cap mono">{t.cap}</span>
                    </div>
                  </div>
                ))}
              </div>
              <ul className="ix-events">
                {copy.integrations.events.map((e) => (
                  <li key={e} className="ix-ev">
                    <i className="ix-dot" />
                    <span className="mono">{e}</span>
                    <span className="ix-pills"><span className="ix-pill-a"><Pill tone="amber">PENDING</Pill></span><span className="ix-pill-b"><Pill tone="green">VERIFIED</Pill></span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <ul className="sr-only">{copy.integrations.events.map((e) => <li key={e}>{e}</li>)}</ul>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>

        <div className="ix-foot">
          <Link href="/#start" className="link-cta" onClick={() => { track("capability_intent_cta_click", { capability: "integrations", placement: "integrations" }); presetBuilder("Integration"); }}>{copy.integrations.cta}</Link>
          {!staticFinal && (
            <button type="button" className="chip chip--mono ix-replay" onClick={replay} disabled={!done && played.current}>
              <RotateCcw aria-hidden /> Replay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
