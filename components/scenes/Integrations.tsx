"use client";
import { ArrowRight, Workflow } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { stack } from "@/content/integrations";
import type { BrandKey } from "@/content/brandIcons";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Reveal } from "@/components/ui/Reveal";

type Sys = { key: BrandKey; label: string };
const SYSTEMS: Sys[] = [
  { key: "stripe", label: "Stripe" }, { key: "hubspot", label: "HubSpot" }, { key: "whatsapp", label: "WhatsApp" }, { key: "gcal", label: "Google Calendar" },
  { key: "gmail", label: "Gmail" }, { key: "supabase", label: "Supabase" }, { key: "anthropic", label: "Anthropic" }, { key: "gdrive", label: "Google Drive" },
];
type Flow = { node: BrandKey; text: string };
/** What happens across the connected systems when each one fires an event. */
const FLOWS: Record<string, Flow[]> = {
  stripe: [{ node: "stripe", text: "Payment received" }, { node: "hubspot", text: "Customer updated" }, { node: "supabase", text: "Order stored" }, { node: "gmail", text: "Receipt sent" }],
  hubspot: [{ node: "hubspot", text: "Deal won" }, { node: "stripe", text: "Invoice created" }, { node: "gdrive", text: "Contract filed" }, { node: "gmail", text: "Welcome email sent" }],
  whatsapp: [{ node: "whatsapp", text: "Message received" }, { node: "anthropic", text: "Request understood" }, { node: "supabase", text: "Ticket created" }, { node: "whatsapp", text: "Reply sent" }],
  gcal: [{ node: "gcal", text: "Booking created" }, { node: "hubspot", text: "Contact updated" }, { node: "whatsapp", text: "Confirmation sent" }, { node: "supabase", text: "Slot locked" }],
  gmail: [{ node: "gmail", text: "Email received" }, { node: "anthropic", text: "Classified" }, { node: "hubspot", text: "Contact updated" }, { node: "gdrive", text: "Attachment filed" }],
  supabase: [{ node: "supabase", text: "Record changed" }, { node: "hubspot", text: "Synced" }, { node: "gmail", text: "Notification sent" }],
  anthropic: [{ node: "anthropic", text: "Model asked" }, { node: "supabase", text: "Context retrieved" }, { node: "hubspot", text: "Result saved" }, { node: "gmail", text: "Summary sent" }],
  gdrive: [{ node: "gdrive", text: "File added" }, { node: "anthropic", text: "Document read" }, { node: "supabase", text: "Fields stored" }, { node: "hubspot", text: "Record linked" }],
};
const ANG = (i: number) => (i / SYSTEMS.length) * Math.PI * 2 - Math.PI / 2;
const at = (i: number, r: number) => [50 + Math.cos(ANG(i)) * r, 50 + Math.sin(ANG(i)) * r] as const;

export function Integrations() {
  const { reduced } = useMotionPreference();
  const [sel, setSel] = useState<BrandKey>("stripe");
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, "-15% 0px -15% 0px");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const played = useRef(false);
  const flow = FLOWS[sel];
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

  return (
    <section id="integrations" className="section ix-sec aisec" aria-labelledby="int-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.integrations.eyebrow}</p>
          <h2 id="int-title" className="h2">{copy.integrations.title}</h2>
          <p className="body-l">{copy.integrations.support}</p>
        </Reveal>
        <div className="aix">
          <div className="aix__orbit" ref={box}>
            <svg viewBox="0 0 100 100" className="aix__lines" preserveAspectRatio="none" aria-hidden>
              {SYSTEMS.map((s, i) => { const [x, y] = at(i, 38); return <line key={s.key} x1="50" y1="50" x2={x} y2={y} data-st={nodeState(s.key)} />; })}
            </svg>
            <div className="aix__hub" data-done={step >= N} aria-hidden><Workflow /><b>Your system</b><em className="mono">Built by StackEndBox</em></div>
            {SYSTEMS.map((s, i) => {
              const [x, y] = at(i, 38);
              const st = nodeState(s.key);
              return (
                <button key={s.key} type="button" className="aix__node aix__node--btn" data-st={st} data-sel={sel === s.key} style={{ left: `${x}%`, top: `${y}%` }} aria-pressed={sel === s.key} aria-label={`${s.label}: show what happens when it fires an event`} onClick={() => choose(s.key)}>
                  <span><BrandIcon name={s.key} size={26} /></span><b>{s.label}</b>
                </button>
              );
            })}
          </div>
          <div className="aix__side">
            <p className="mono mono--muted">SELECT A SYSTEM</p>
            <ol className="aix__steps" aria-live="polite" aria-label="Events across your systems">
              {flow.map((s, i) => {
                const st = step > i ? "done" : step === i ? "active" : "idle";
                return <li key={sel + i} data-st={st}><span className="mono">{String(i + 1).padStart(2, "0")}</span><BrandIcon name={s.node} size={16} />{s.text}</li>;
              })}
            </ol>
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "integrations" }); presetBuilder("API / Integration"); }}>{copy.integrations.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
        <div className="ixops" aria-hidden>
          <div className="ixops__p">
            <b className="mono">EVENT STREAM</b>
            {flow.map((f, i) => {
              const st = step > i ? "ok" : step === i ? (i === 1 ? "retry" : "run") : "wait";
              return <div key={sel + i} className="ixops__r" data-st={st}><span className="mono">evt_{(2041 + i * 7).toString(16)}</span><em>{f.text}</em><i className="mono">{st === "ok" ? "OK" : st === "retry" ? "RETRY 1" : st === "run" ? "RUNNING" : "QUEUED"}</i></div>;
            })}
          </div>
          <div className="ixops__p">
            <b className="mono">MAPPING</b>
            <div className="ixops__m"><code>{sel}.id</code><span>→</span><code>{flow[1]?.node ?? "crm"}.external_id</code></div>
            <div className="ixops__m"><code>{sel}.email</code><span>→</span><code>{flow[1]?.node ?? "crm"}.contact</code></div>
            <div className="ixops__m"><code>{sel}.amount</code><span>→</span><code>{flow[2]?.node ?? "db"}.total</code></div>
          </div>
          <div className="ixops__p">
            <b className="mono">SYNC HEALTH</b>
            <div className="ixops__h" data-ok={step >= N}><span>Webhook signature</span><i className="mono">VERIFIED</i></div>
            <div className="ixops__h" data-ok={step >= N}><span>Retries</span><i className="mono">{step > 1 ? "1 RESOLVED" : "PENDING"}</i></div>
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
    </section>
  );
}
