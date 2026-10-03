"use client";
import { ArrowRight, Bot, Check, Database, Lock, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";

type L = { id: string; title: string; sub: string };
const LAYERS: L[] = [
  { id: "ui", title: "Interface", sub: "Responsive screens, states, accessibility" },
  { id: "logic", title: "Product logic", sub: "Rules, workflows, validation" },
  { id: "auth", title: "Authentication", sub: "Sessions, roles, permissions" },
  { id: "api", title: "API", sub: "Typed endpoints, webhooks, limits" },
  { id: "db", title: "Database", sub: "Schemas, migrations, backups" },
  { id: "ai", title: "AI", sub: "Models, retrieval, guardrails" },
  { id: "int", title: "Integrations", sub: "Payments, CRM, messaging, sync" },
  { id: "test", title: "Testing", sub: "Unit, integration, end to end" },
  { id: "ship", title: "Deployment", sub: "Releases, monitoring, rollback" },
];
const STAGES = LAYERS.length + 2; // 0 compressed, 1..9 one layer each, 10 compressed and live
const LAST = STAGES - 1;

function Art({ id }: { id: string }) {
  switch (id) {
    case "ui": return <div className="dpx-ui"><i /><i /><i /><s /></div>;
    case "logic": return <div className="dpx-logic">{["IF", "THEN", "ELSE"].map((t) => <span key={t}><b className="mono">{t}</b><i /></span>)}</div>;
    case "auth": return <div className="dpx-auth"><Lock /><span>Admin</span><span>Staff</span><span>Customer</span></div>;
    case "api": return <div className="dpx-api">{[["GET", "/bookings", "200"], ["POST", "/payments", "201"], ["POST", "/webhooks", "200"]].map(([m, p, c]) => <span key={p}><b className="mono">{m}</b><em className="mono">{p}</em><i className="mono">{c}</i></span>)}</div>;
    case "db": return <div className="dpx-db"><Database />{[0, 1, 2].map((r) => <span key={r}><i /><i /><i /></span>)}</div>;
    case "ai": return <div className="dpx-ai"><Bot /><i /><i /><i /></div>;
    case "int": return <div className="dpx-int">{(["stripe", "hubspot", "whatsapp", "gcal"] as const).map((k) => <span key={k}><BrandIcon name={k} size={18} /></span>)}</div>;
    case "test": return <div className="dpx-test">{["Unit", "Integration", "End to end"].map((t) => <span key={t}><Check />{t}</span>)}</div>;
    default: return <div className="dpx-ship">{["Build", "Test", "Deploy"].map((t) => <span key={t}><Check />{t}</span>)}<em className="mono"><Rocket /> LIVE</em></div>;
  }
}

/** Stage-driven 2.5D stack. Scroll picks a stage, so every frame is complete and contained. */
export function UnderInterface() {
  const { reduced } = useMotionPreference();
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-15% 0px -15% 0px");
  const near = useInView(root, "300px 0px 300px 0px");
  const played = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => { if (reduced) setStage(LAST); }, [reduced]);
  useEffect(() => {
    const el = root.current;
    if (!el || reduced || !near) return;
    if (!window.matchMedia("(min-width: 900px)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const span = el.offsetHeight - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / span)) : 0;
      const n = Math.min(LAST, Math.floor(p * (STAGES - 0.001)));
      setStage((s) => (s === n ? s : n));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [near, reduced]);

  const play = () => {
    clearInterval(timer.current);
    let k = 0;
    setStage(0);
    timer.current = setInterval(() => { k += 1; setStage(k); if (k >= LAST) clearInterval(timer.current); }, 950);
  };
  useEffect(() => {
    if (reduced || !inView || played.current) return;
    if (window.matchMedia("(min-width: 900px)").matches) return;
    played.current = true;
    play();
  }, [inView, reduced]);
  useEffect(() => () => clearInterval(timer.current), []);

  const active = stage >= 1 && stage <= LAYERS.length ? stage - 1 : -1;
  const expanded = stage >= 1 && stage <= LAYERS.length;
  const live = stage === LAST;

  return (
    <section id="depth" ref={root} className="dpx" aria-labelledby="depth-title" data-expanded={expanded} data-live={live}>
      <div className="dpx__sticky">
        <div className="container dpx__in">
          <div className="dpx__copy">
            <p className="eyebrow">{copy.depth.eyebrow}</p>
            <h2 id="depth-title" className="h2">{copy.depth.title}</h2>
            <ol className="dpx__list" aria-label="Layers behind the interface">
              {LAYERS.map((l, i) => (
                <li key={l.id} data-st={active === i ? "active" : stage > i + 1 || live ? "done" : "idle"} aria-current={active === i ? "step" : undefined}>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span><b>{l.title}</b><em>{l.sub}</em>
                </li>
              ))}
            </ol>
            <div className="dpx__ctas">
              <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "depth" }); presetBuilder("Custom Software"); }}>{copy.depth.cta}<ArrowRight className="arrow" aria-hidden /></Link>
              {!reduced && <button type="button" className="chip chip--mono" onClick={() => { track("scene_replay", { scene: "depth" }); played.current = true; play(); }}>Replay</button>}
            </div>
          </div>
          <div className="dpx__stage" ref={box} aria-hidden>
            <div className="dpx__world">
              {LAYERS.map((l, i) => (
                <div key={l.id} className="dpx-l" data-act={active === i} style={{ ["--k" as string]: LAYERS.length - 1 - i }}>
                  <b className="mono dpx-l__t">{l.title.toUpperCase()}</b>
                  <Art id={l.id} />
                </div>
              ))}
            </div>
            <div className="dpx__detail" data-on={active >= 0} key={active}>
              {active >= 0 && (<><b className="mono">{String(active + 1).padStart(2, "0")} {LAYERS[active].title.toUpperCase()}</b><Art id={LAYERS[active].id} /></>)}
            </div>
            <span className="dpx__live" data-on={live}><ShieldCheck /> All checks passing</span>
          </div>
        </div>
      </div>
      <p className="sr-only">An application separates into nine layers: interface, product logic, authentication, API, database, AI, integrations, testing and deployment, then settles into one live product.</p>
    </section>
  );
}
