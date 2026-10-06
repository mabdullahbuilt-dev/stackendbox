"use client";
import { ArrowRight, Braces } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { stack } from "@/content/integrations";
import type { BrandKey } from "@/content/brandIcons";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Aperture } from "@/components/site/Aperture";

type Sys = { key: BrandKey; label: string };
const LEFT: Sys[] = [{ key: "stripe", label: "Stripe" }, { key: "gcal", label: "Google Calendar" }, { key: "whatsapp", label: "WhatsApp" }, { key: "gmail", label: "Gmail" }];
const RIGHT: Sys[] = [{ key: "hubspot", label: "HubSpot" }, { key: "supabase", label: "Supabase" }, { key: "anthropic", label: "Anthropic" }, { key: "gdrive", label: "Google Drive" }];
const Y = [14, 38, 62, 86];
type Flow = { node: BrandKey; text: string };
/** What happens across the connected systems when each one fires an event. */
const FLOWS: Record<string, Flow[]> = {
  stripe: [{ node: "stripe", text: "payment.completed received" }, { node: "stripe", text: "Signature verified" }, { node: "hubspot", text: "Fields mapped, contact updated" }, { node: "supabase", text: "Order written" }, { node: "gmail", text: "Confirmation sent" }],
  hubspot: [{ node: "hubspot", text: "Deal won" }, { node: "stripe", text: "Invoice created" }, { node: "gdrive", text: "Contract filed" }, { node: "gmail", text: "Welcome email sent" }],
  whatsapp: [{ node: "whatsapp", text: "Message received" }, { node: "anthropic", text: "Request understood" }, { node: "supabase", text: "Ticket created" }, { node: "whatsapp", text: "Reply sent" }],
  gcal: [{ node: "gcal", text: "Booking created" }, { node: "hubspot", text: "Contact updated" }, { node: "whatsapp", text: "Confirmation sent" }, { node: "supabase", text: "Slot locked" }],
  gmail: [{ node: "gmail", text: "Email received" }, { node: "anthropic", text: "Classified" }, { node: "hubspot", text: "Contact updated" }, { node: "gdrive", text: "Attachment filed" }],
  supabase: [{ node: "supabase", text: "Record changed" }, { node: "hubspot", text: "Synced" }, { node: "gmail", text: "Notification sent" }],
  anthropic: [{ node: "anthropic", text: "Model asked" }, { node: "supabase", text: "Context retrieved" }, { node: "hubspot", text: "Result saved" }, { node: "gmail", text: "Summary sent" }],
  gdrive: [{ node: "gdrive", text: "File added" }, { node: "anthropic", text: "Document read" }, { node: "supabase", text: "Fields stored" }, { node: "hubspot", text: "Record linked" }],
};

const PAYLOAD = '{ "type": "payment.completed",\n  "amount": 4900,\n  "customer": "cus_8f2" }';

function SysBtn({ x, st, sel, onPick }: { x: Sys; st: "idle" | "active" | "done"; sel: boolean; onPick: (k: BrandKey) => void }) {
  return (
    <button type="button" className="ixnet__node" data-key={x.key} data-st={st} data-sel={sel} aria-pressed={sel} aria-label={`${x.label}: show what happens when it fires an event`} onClick={() => onPick(x.key)}>
      <span><BrandIcon name={x.key} size={22} /></span><b>{x.label}</b>
    </button>
  );
}

export function Integrations() {
  const { reduced } = useMotionPreference();
  const [sel, setSel] = useState<BrandKey>("stripe");
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-15% 0px -15% 0px");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const played = useRef(false);
  const [wake, setWake] = useState<BrandKey | null>(null);
  const flow = FLOWS[sel];
  const others = flow.map((f) => f.node).filter((n, i, a) => n !== sel && a.indexOf(n) === i);
  const dest = others[0], dest2 = others[1] ?? others[0];
  const N = flow.length;

  const play = (key: BrandKey) => {
    clearInterval(timer.current);
    const n = FLOWS[key].length;
    let k = 0;
    setStep(0);
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= n) clearInterval(timer.current); }, 800);
  };
  useEffect(() => { if (reduced) setStep(N); }, [reduced, N, sel]);
  useEffect(() => {
    if (reduced || !inView || played.current) return;
    played.current = true;
    const t = setTimeout(() => play("stripe"), 400);
    return () => clearTimeout(t);
  }, [inView, reduced]);
  useEffect(() => () => clearInterval(timer.current), []);

  const choose = (k: BrandKey) => { setSel(k); track("integration_selected", { system: k }); if (reduced) setStep(FLOWS[k].length); else play(k); };
  const nodeState = (k: BrandKey): "idle" | "active" | "done" => {
    let st: "idle" | "active" | "done" = "idle";
    flow.forEach((s, i) => { if (s.node !== k) return; if (step > i) st = "done"; else if (step === i && st !== "done") st = "active"; });
    return st;
  };

  // Payload packet: sits on the connection of whichever system the current step belongs to.
  const here = flow[Math.min(step, N - 1)]?.node;
  const li = LEFT.findIndex((x) => x.key === here), ri = RIGHT.findIndex((x) => x.key === here);
  const pkt = li >= 0 ? { x: 33.5, y: (Y[li] + 50) / 2 } : ri >= 0 ? { x: 66.5, y: (Y[ri] + 50) / 2 } : { x: 50, y: 50 };

  // Path wake: the single connection nearest the pointer lights up (one local path, never the whole network).
  const onMapMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduced) return;
    let best: BrandKey | null = null, bd = 90;
    e.currentTarget.querySelectorAll<HTMLElement>(".ixnet__node").forEach((n) => { const r = n.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY); if (d < bd) { bd = d; best = n.dataset.key as BrandKey; } });
    setWake((w) => (w === best ? w : best));
  };

  return (
    <section id="integrations" className="section ix-sec aisec" aria-labelledby="int-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.integrations.eyebrow}</p>
          <h2 id="int-title" className="h2">{copy.integrations.title}</h2>
          <p className="body-l">{copy.integrations.support}</p>
        </Reveal>
        <div className="ixnet">
          <div className="ixnet__map" onPointerMove={onMapMove} onPointerLeave={() => setWake(null)}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ixnet__lines" aria-hidden>
              {LEFT.map((x, i) => <line key={x.key} x1="26" y1={Y[i]} x2="41" y2="50" data-st={nodeState(x.key)} data-wake={wake === x.key} />)}
              {RIGHT.map((x, i) => <line key={x.key} x1="59" y1="50" x2="74" y2={Y[i]} data-st={nodeState(x.key)} data-wake={wake === x.key} />)}
              <circle className="ixnet__pkt" cx={pkt.x} cy={pkt.y} r="1.6" data-on={step < N} />
            </svg>
            <div className="ixnet__col ixnet__col--l">
              {LEFT.map((x) => <SysBtn key={x.key} x={x} st={nodeState(x.key)} sel={sel === x.key} onPick={choose} />)}
            </div>
            <div className="ixnet__core" data-done={step >= N} aria-hidden><Braces /><b>Your application</b><em className="mono">API · WEBHOOKS · MAPPING</em></div>
            <div className="ixnet__col ixnet__col--r">
              {RIGHT.map((x) => <SysBtn key={x.key} x={x} st={nodeState(x.key)} sel={sel === x.key} onPick={choose} />)}
            </div>
          </div>
          <div className="aix__side">
            <p className="mono mono--muted">SELECT A SYSTEM</p>
            <ol className="aix__steps" aria-live="polite" aria-label="Events across the connected systems">
              {flow.map((s, i) => {
                const st = step > i ? "done" : step === i ? "active" : "idle";
                return <li key={sel + i} data-st={st}><span className="mono">{String(i + 1).padStart(2, "0")}</span><BrandIcon name={s.node} size={16} />{s.text}</li>;
              })}
            </ol>
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "integrations" }); goToBuilder(e, "API / Integration"); }}>{copy.integrations.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
        <div className="ixops" aria-hidden>
          <div className="ixops__p">
            <b className="mono">EVENT STREAM</b>
            {flow.map((f, i) => {
              const st = step > i ? "ok" : step === i ? "run" : "wait";
              return <div key={sel + i} className="ixops__r" data-st={st}><span className="mono">evt_{(2041 + i * 7).toString(16)}</span><em>{f.text}</em><i className="mono">{st === "ok" ? "OK" :  st === "run" ? "RUNNING" : "QUEUED"}</i></div>;
            })}
          </div>
          <div className="ixops__p">
            <b className="mono">{sel === "stripe" ? "PAYLOAD AND MAPPING" : "MAPPING"}</b>
            {sel === "stripe" && <pre className="ixops__json mono" data-on={step >= 1}>{PAYLOAD}</pre>}
            <div className="ixops__m"><code>{sel}.id</code><span>→</span><code>{dest ?? "crm"}.external_id</code></div>
            <div className="ixops__m"><code>{sel}.email</code><span>→</span><code>{dest ?? "crm"}.contact</code></div>
            <div className="ixops__m"><code>{sel}.amount</code><span>→</span><code>{dest2 ?? "db"}.total</code></div>
          </div>
          <div className="ixops__p">
            <b className="mono">SYNC HEALTH</b>
            <div className="ixops__h" data-ok={step >= N}><span>Webhook signature</span><i className="mono">VERIFIED</i></div>
            <div className="ixops__h" data-ok={step >= N}><span>Retries</span><i className="mono">{step >= N ? "NONE NEEDED" : "0 SO FAR"}</i></div>
            <div className="ixops__h" data-ok={step >= N}><span>Systems in sync</span><i className="mono">{step >= N ? "ALL" : "SYNCING"}</i></div>
          </div>
        </div>
        <div className="ixw__tech">
          <p className="mono mono--muted">{copy.integrations.techLabel}</p>
          <ul aria-label="Technology we build with">
            {stack.map((t) => <li key={t.key}><BrandIcon name={t.key} size={18} />{t.label}</li>)}
          </ul>
        </div>
      </div>
      <Aperture kind="payload" />
    </section>
  );
}
