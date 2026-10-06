"use client";
import { ArrowRight, BarChart3, Check, Database, Lock, Rocket, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import { useInView } from "@/lib/hooks";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";

const STEPS = ["Brief", "User flow", "Wireframe", "Interface", "Frontend", "Backend", "Data", "Access", "Billing", "Admin", "Mobile", "Verify", "Live"] as const;
const LAST = STEPS.length - 1;
/** Visitor-facing grouping of the 11 internal build stages. */
const GROUPS: { name: string; from: number; to: number }[] = [
  { name: "PLAN", from: 0, to: 1 }, { name: "DESIGN", from: 2, to: 3 }, { name: "BUILD", from: 4, to: 10 }, { name: "VERIFY", from: 11, to: 11 }, { name: "SHIP", from: 12, to: 12 },
];
const on = (s: number, from: number) => s >= from;

/**
 * Scroll maps to a discrete build stage (0..10), so every scroll position is a finished, readable frame.
 * Driven by the shared chapter runtime: on desktop the sticky runway maps to the 13 stages, on small screens the pass-through
 * range does. Scrolling back reverses the build; every visit replays it. Reduced motion shows the finished product.
 */
export function IdeaToProduct() {
  const { reduced } = useMotionPreference();
  const step = useChapterStep("product", STEPS.length);
  const stage = reduced ? LAST : step;
  const box = useRef<HTMLDivElement>(null);

  // Pointer: 3 to 5px depth parallax between interface, logic plane and grid. This stage only, one rAF, fine pointer only.
  useEffect(() => {
    const el = box.current;
    if (!el || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => { raf = 0; el.style.setProperty("--ppx", x.toFixed(3)); el.style.setProperty("--ppy", y.toFixed(3)); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 2 - 1; y = ((e.clientY - r.top) / r.height) * 2 - 1; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);

  return (
    <section id="product" className="ipv" data-scroll="pin" aria-labelledby="product-title" data-s={stage}>
      <div className="ipv__sticky">
        <div className="container ipv__in">
          <div className="ipv__copy">
            <p className="eyebrow">{copy.product.eyebrow}</p>
            <h2 id="product-title" className="h2">{copy.product.title}</h2>
            <ol className="ipv__steps" aria-label="Build stages">
              {GROUPS.map((g, i) => {
                const st = stage > g.to ? "done" : stage >= g.from ? "active" : "idle";
                return (
                  <li key={g.name} data-st={st} aria-current={st === "active" ? "step" : undefined}>
                    <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                    <b>{g.name}</b>
                    <em>{st === "active" ? STEPS[stage] : st === "done" ? STEPS.slice(g.from, g.to + 1).join(", ") : STEPS.slice(g.from, g.to + 1)[0]}</em>
                  </li>
                );
              })}
            </ol>
            <div className="ipv__ctas">
              <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("mvp_cta", { placement: "product" }); goToBuilder(e, "SaaS / MVP", "Idea"); }}>{copy.product.cta}<ArrowRight className="arrow" aria-hidden /></Link>
            </div>
          </div>

          <div className="ipv__stage" ref={box} aria-hidden>
            <div className="ipv__canvas" data-focus={stage === 0}>
              {/* requirements extracted from the brief: frame zero already reads as the start of a real build */}
              <ul className="ipv-req mono" data-on={stage <= 1}>{["ACCOUNTS", "REQUESTS", "DOCUMENTS", "PAYMENTS", "ADMIN", "ROLES"].map((t, i) => <li key={t} style={{ ["--i" as string]: i }}><i />{t}</li>)}</ul>
              {/* 0 brief */}
              <div className="ipv-brief"><span className="mono">BRIEF</span><p>{copy.product.brief}</p></div>
              {/* 1 flow */}
              <div className="ipv-flow" data-on={on(stage, 1)}>{["Sign in", "Submit request", "Team review", "Pay invoice"].map((t, i) => <span key={t} style={{ ["--i" as string]: i }}>{t}</span>)}</div>
              {/* 2-3 window: wireframe then interface */}
              <div className="ipv-back" data-on={on(stage, 5)}><b className="mono">BACKEND</b><span className="mono">API · SERVICES · JOBS</span></div>
              <div className="ipv-win" data-on={on(stage, 2)} data-ui={on(stage, 3)} data-fe={on(stage, 4)}>
                <div className="ipv-win__bar"><i /><i /><i /><b>Client portal</b></div>
                <div className="ipv-win__body">
                  <div className="ipv-wf"><u /><u /><u /><s /><s /><em /></div>
                  <div className="ipv-ui">
                    <aside><b data-act>Requests</b><b>Documents</b><b>Payments</b></aside>
                    <div><span className="mono">YOUR REQUESTS</span><div className="ipv-rq">{[["Brand refresh", "In review"], ["Site migration", "Approved"], ["Quarterly report", "Delivered"]].map(([t, st], i) => <p key={t} data-act={i === 0}><span>{t}</span><em>{st}</em></p>)}</div><button type="button" tabIndex={-1}>New request</button></div>
                  </div>
                </div>
              </div>
              {/* 4 mobile */}
              <div className="ipv-phone" data-on={on(stage, 10)}><span /><b>Requests</b><div className="ipv-rq">{[["Brand refresh", "Review"], ["Site migration", "Approved"]].map(([t, st], i) => <p key={t} data-act={i === 0}><span>{t}</span><em>{st}</em></p>)}</div><em>New request</em></div>
              {/* 5 access */}
              <div className="ipv-card ipv-auth" data-on={on(stage, 7)}><Lock aria-hidden /><div><b>Sign in</b><span>Client, team, admin roles</span></div><Check className="ipv-ok" aria-label="secured" /></div>
              {/* 6 data */}
              <div className="ipv-card ipv-db" data-on={on(stage, 6)}><Database aria-hidden /><div><b>Data</b>{["accounts", "projects", "requests", "payments"].map((t) => <span key={t} className="mono">{t}</span>)}</div></div>
              {/* 7 billing */}
              <div className="ipv-card ipv-bill" data-on={on(stage, 8)}><BrandIcon name="stripe" size={20} /><div><b>Payments</b><span>Invoices and plans</span></div><Check className="ipv-ok" aria-label="active" /></div>
              {/* 8 admin */}
              <div className="ipv-card ipv-admin" data-on={on(stage, 9)}><div className="ipv-admin__h"><Users aria-hidden /><b>Admin console</b><BarChart3 aria-hidden /></div><div className="ipv-bars">{[38, 62, 48, 80, 58, 72, 90].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div>
              {/* 9 tests, 10 live */}
              <div className="ipv-chips"><span data-on={on(stage, 11)}><ShieldCheck aria-hidden />Tests passing</span><span data-on={on(stage, 12)} className="ipv-live"><Rocket aria-hidden />LIVE in production</span></div>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only">A client portal brief becomes a user flow and a wireframe, then a finished interface with a mobile version, sign-in and roles, a database, billing, an admin console, passing tests and a live production deployment.</p>
    </section>
  );
}
