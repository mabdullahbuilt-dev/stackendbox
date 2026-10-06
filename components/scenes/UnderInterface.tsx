"use client";
import { ArrowRight, Bot, Check, Database, Lock, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";

type L = { id: string; title: string; sub: string; inspect: string };
const LAYERS: L[] = [
  { id: "ui", title: "Interface", sub: "Responsive screens, states, accessibility", inspect: "COMPONENT LAYOUT" },
  { id: "logic", title: "Product logic", sub: "Rules, workflows, validation", inspect: "BUSINESS RULES" },
  { id: "auth", title: "Authentication", sub: "Sessions, roles, permissions", inspect: "ROLE MATRIX" },
  { id: "api", title: "API", sub: "Typed endpoints, webhooks, limits", inspect: "REQUEST AND RESPONSE" },
  { id: "db", title: "Database", sub: "Schemas, migrations, backups", inspect: "SCHEMA" },
  { id: "ai", title: "AI", sub: "Models, retrieval, guardrails", inspect: "MODEL AND TOOL PATH" },
  { id: "int", title: "Integrations", sub: "Payments, CRM, messaging, sync", inspect: "EXTERNAL SERVICES" },
  { id: "test", title: "Testing", sub: "Unit, integration, end to end", inspect: "TEST MATRIX" },
  { id: "ship", title: "Delivery", sub: "Releases, monitoring, rollback", inspect: "BUILD AND DEPLOY PIPELINE" },
];

const REQ = '/v1/requests\n{ "title": "Brand refresh",\n  "owner": "usr_204" }';
const RES = 'Created\n{ "id": "req_8812",\n  "status": "in_review" }';

/** Meaningful inspector visual for each layer (not decorative checklists). */
function Inspector({ id }: { id: string }) {
  switch (id) {
    case "ui": return (
      <div className="xi-ui">
        <div className="xi-tree">{[["AppShell", 0], ["Sidebar", 1], ["RequestTable", 1], ["Row", 2], ["DetailDrawer", 1], ["StatusBadge", 2]].map(([t, d]) => <span key={t as string} style={{ ["--d" as string]: d }}><b className="mono">{t}</b></span>)}</div>
        <div className="xi-wire"><i /><i /><i /><s /></div>
      </div>);
    case "logic": return (
      <table className="xi-rules"><tbody>
        {[["Request over $5,000", "needs Finance approval"], ["Owner missing", "assign by team load"], ["Approved and paid", "close and notify client"], ["Overdue 3 days", "escalate to admin"]].map(([a, b]) => <tr key={a}><td><b className="mono">IF</b>{a}</td><td><b className="mono">THEN</b>{b}</td></tr>)}
      </tbody></table>);
    case "auth": return (
      <table className="xi-matrix"><thead><tr><th /><th className="mono">VIEW</th><th className="mono">EDIT</th><th className="mono">APPROVE</th><th className="mono">ADMIN</th></tr></thead><tbody>
        {[["Client", [1, 0, 0, 0]], ["Staff", [1, 1, 0, 0]], ["Manager", [1, 1, 1, 0]], ["Admin", [1, 1, 1, 1]]].map(([r, v]) => <tr key={r as string}><th>{r as string}</th>{(v as number[]).map((x, i) => <td key={i} data-on={!!x}>{x ? <Check aria-label="allowed" /> : <span aria-label="no access">-</span>}</td>)}</tr>)}
      </tbody></table>);
    case "api": return (
      <div className="xi-api">
        <pre className="mono"><b>POST</b> {REQ}</pre>
        <pre className="mono xi-ok"><b>201</b> {RES}</pre>
      </div>);
    case "db": return (
      <div className="xi-db">
        {[["accounts", ["id", "name", "plan"]], ["requests", ["id", "account_id", "status"]], ["payments", ["id", "request_id", "amount"]]].map(([t, c]) => <div key={t as string}><b className="mono"><Database />{t as string}</b>{(c as string[]).map((x) => <span key={x} className="mono">{x}</span>)}</div>)}
        <i className="xi-rel xi-rel--a" /><i className="xi-rel xi-rel--b" />
      </div>);
    case "ai": return (
      <ol className="xi-ai">{[["Request", "text and files"], ["Retrieve", "policy and history"], ["Model", "classify and draft"], ["Tool", "update the record"], ["Approval", "a person confirms"]].map(([t, s], i) => <li key={t} data-hl={i === 4}><span>{i === 2 ? <Bot /> : i === 4 ? <ShieldCheck /> : <i />}</span><b>{t}</b><em>{s}</em></li>)}</ol>);
    case "int": return (
      <div className="xi-int">{([["stripe", "Payments", "payment.completed"], ["hubspot", "CRM", "contact.updated"], ["whatsapp", "Messages", "message.sent"], ["gcal", "Calendar", "event.created"]] as const).map(([k, t, e]) => <div key={k}><BrandIcon name={k} size={20} /><b>{t}</b><span className="mono">{e}</span></div>)}</div>);
    case "test": return (
      <table className="xi-tests"><thead><tr><th /><th className="mono">UNIT</th><th className="mono">API</th><th className="mono">E2E</th></tr></thead><tbody>
        {[["Sign in", [1, 1, 1]], ["Submit request", [1, 1, 1]], ["Approval", [1, 1, 2]], ["Payment", [1, 1, 1]]].map(([r, v]) => <tr key={r as string}><th>{r as string}</th>{(v as number[]).map((x, i) => <td key={i} data-t={x === 1 ? "ok" : "fixed"}><Check aria-label={x === 1 ? "passing" : "fixed and passing"} /></td>)}</tr>)}
      </tbody></table>);
    default: return (
      <div className="xi-ship">{["Build", "Test", "Deploy", "Monitor"].map((t) => <span key={t}><Check />{t}</span>)}<em className="mono"><Rocket /> LIVE</em></div>);
  }
}

/** Tiny per-plane schematic so each slab in the stack reads as its own layer. */
function Slab({ id }: { id: string }) {
  switch (id) {
    case "logic": return <div className="xs-lines"><i /><i /><i /></div>;
    case "auth": return <div className="xs-chips"><Lock /><i /><i /><i /></div>;
    case "api": return <div className="xs-lines xs-lines--m"><i /><i /></div>;
    case "db": return <div className="xs-chips"><Database /><i /><i /></div>;
    case "ai": return <div className="xs-chips"><Bot /><i /><i /></div>;
    case "int": return <div className="xs-chips"><i /><i /><i /><i /></div>;
    case "test": return <div className="xs-lines"><i /><i /><i /></div>;
    default: return <div className="xs-chips"><Rocket /><i /><i /></div>;
  }
}

/**
 * PRODUCT X-RAY. A complete product interface sits on top of nine real layers. Select a layer (click, tap, key or hover)
 * and it lifts 14px, the interface turns see-through and an inspector shows what that layer contains.
 * CSS 2.5D only, no pin, no scroll lock; the pointer adds a 2.5 degree parallax over this stage only.
 */
export function UnderInterface() {
  const { reduced } = useMotionPreference();
  // Scroll drives the layer sequence (and reverses it): 0 complete product, 1..9 one layer each, 10 complete and verified.
  const raw = useChapterStep("depth", LAYERS.length + 2);
  const [pickd, setPickd] = useState<{ i: number | null; at: number } | null>(null);
  const auto = reduced ? null : raw >= 1 && raw <= LAYERS.length ? raw - 1 : null;
  const sel = pickd && pickd.at === raw ? pickd.i : auto;
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const setSel = (i: number | null) => setPickd({ i, at: raw });

  // Pointer parallax (max 2.5 degrees), this stage only, one rAF, fine pointer only.
  useEffect(() => {
    const el = box.current;
    if (!el || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => { raf = 0; el.style.setProperty("--rx", x.toFixed(3)); el.style.setProperty("--ry", y.toFixed(3)); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 2 - 1; y = ((e.clientY - r.top) / r.height) * 2 - 1; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);

  const pick = (i: number | null, how: string) => { setSel(i); if (i !== null) track("scene_replay", { scene: "depth", layer: LAYERS[i].id, method: how }); };
  const onKey = (e: React.KeyboardEvent) => {
    const n = LAYERS.length;
    const cur = sel ?? -1;
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = (cur + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = (cur - 1 + n) % n;
    else if (e.key === "Home") i = 0; else if (e.key === "End") i = n - 1;
    if (i >= 0) { e.preventDefault(); pick(i, "key"); tabs.current[i]?.focus(); }
  };

  const L = sel !== null ? LAYERS[sel] : null;
  return (
    <section id="depth" className="dpx" data-scroll="pin" aria-labelledby="depth-title" data-sel={sel ?? "none"} data-step={raw}>
      <div className="dpx__sticky">
      <div className="container dpx__in">
        <div className="dpx__copy">
          <p className="eyebrow">{copy.depth.eyebrow}</p>
          <h2 id="depth-title" className="h2">{copy.depth.title}</h2>
          <p className="body-l">{copy.depth.support}</p>
          <div className="dpx__list" role="tablist" aria-orientation="vertical" aria-label="Layers behind the interface" onKeyDown={onKey}>
            {LAYERS.map((l, i) => (
              <button key={l.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`xr-${l.id}`} aria-selected={sel === i} aria-controls="xr-panel" tabIndex={sel === i || (sel === null && i === 0) ? 0 : -1} className="dpx__tab" data-st={sel === i ? "active" : "idle"}
                onClick={() => pick(sel === i ? null : i, "click")} >
                <span className="mono">{String(i + 1).padStart(2, "0")}</span><b>{l.title}</b><em>{l.sub}</em>
              </button>
            ))}
          </div>
          <div className="dpx__ctas">
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "depth" }); goToBuilder(e, "Custom Software"); }}>{copy.depth.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
        <div className="xr" ref={box} data-sel={sel ?? "none"}>
          <div className="xr__scene" aria-hidden>
            <div className="xr__tilt">
              <div className="xr__world">
                {LAYERS.slice(1).map((l, j) => {
                  const i = j + 1;
                  return (
                    <div key={l.id} className="xr-slab" data-act={sel === i} data-below={sel !== null && sel < i} style={{ ["--k" as string]: LAYERS.length - 1 - i }} onClick={() => pick(i, "stack")}>
                      <b className="mono">{l.title.toUpperCase()}</b><Slab id={l.id} />
                    </div>
                  );
                })}
                <div className="xr-slab xr-ui" data-act={sel === 0} data-xray={sel !== null && sel !== 0} style={{ ["--k" as string]: LAYERS.length }} onClick={() => pick(0, "stack")}>
                  <div className="xr-ui__bar"><i /><i /><i /><b className="mono">Northwind portal</b></div>
                  <div className="xr-ui__body"><aside><i /><i /><i /><i /></aside><div><u /><u /><u /><em>Submit request</em></div></div>
                </div>
              </div>
            </div>
          </div>
          <div id="xr-panel" role="tabpanel" aria-labelledby={L ? `xr-${L.id}` : undefined} className="xr__inspector" data-on={!!L}>
            {L ? (
              <div key={L.id} className="xr__ins"><b className="mono">{String((sel ?? 0) + 1).padStart(2, "0")} {L.inspect}</b><Inspector id={L.id} /></div>
            ) : (
              <p className="xr__hint mono">NINE LAYERS UNDER ONE INTERFACE · SCROLL TO INSPECT EACH</p>
            )}
          </div>
          <span className="xr__live" data-on={sel === null && raw > LAYERS.length}><ShieldCheck /> Complete product, all checks passing</span>
        </div>
      </div>
      </div>
      <p className="sr-only">An application is shown with nine layers beneath its interface: logic, authentication, API, database, AI, integrations, testing and delivery. Selecting a layer opens an inspector for it.</p>
    </section>
  );
}
