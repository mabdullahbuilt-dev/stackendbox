import { Activity, GitCompareArrows, ListTree, RotateCcw, Webhook } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { AppShell, Chip } from "./Shell";
import type { BrandKey } from "@/content/brandIcons";

export const CONNECTHUB_STEPS = 7;
const CONNS: [BrandKey, string][] = [["stripe", "Stripe"], ["hubspot", "HubSpot"], ["postgres", "PostgreSQL"], ["whatsapp", "WhatsApp"], ["gcal", "Calendar"]];

export function ConnectHub({ step }: { step: number }) {
  const state = (i: number): "ok" | "run" | "idle" => (step > i + 1 ? "ok" : step === i + 1 ? "run" : "idle");
  const events: [string, string, "ok" | "run" | "bad" | "idle"][] = [
    ["payment.completed", "Stripe", step >= 2 ? "ok" : step >= 1 ? "run" : "idle"],
    ["contact.updated", "HubSpot", step >= 3 ? "ok" : step >= 2 ? "run" : "idle"],
    ["order.stored", "PostgreSQL", step >= 4 ? "ok" : step >= 3 ? "run" : "idle"],
    ["message.sent", "WhatsApp", step >= 5 ? "ok" : step >= 4 ? "run" : "idle"],
    ["calendar.sync 504", "Calendar", step >= 7 ? "ok" : step >= 6 ? "bad" : "idle"],
  ];
  return (
    <AppShell
      name="ConnectHub" active={1} title="Event stream"
      nav={[[ListTree, "Connections"], [Activity, "Events"], [GitCompareArrows, "Mappings"], [Webhook, "Webhooks"], [RotateCcw, "Retries"]]}
      top={<Chip tone={step >= 7 ? "ok" : step >= 6 ? "bad" : "run"}>{step >= 7 ? "All synced" : step >= 6 ? "1 retry queued" : "Syncing"}</Chip>}
      rail={
        <>
          <div className="pa-card"><b className="mono">CONNECTIONS</b>
            <ul className="pa-conns">{CONNS.map(([k, t], i) => <li key={k}><BrandIcon name={k} size={15} />{t}<span data-st={state(i)} /></li>)}</ul>
          </div>
          <div className="pa-card"><b className="mono">FIELD MAPPING</b><div className="pa-map"><span>amount</span><span>deal.value</span><span>email</span><span>contact.email</span></div></div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Event</span><span>Source</span><span>Status</span></div>
        {events.map(([e, s, t], i) => (
          <div key={e} className="pa-tr pa-tr3" data-on={t !== "idle"} data-cur={t === "run" || (t === "bad")}>
            <span className="mono">{e}</span><span>{s}</span>
            <span>{t === "idle" ? <Chip tone="idle">Waiting</Chip> : <Chip tone={t}>{t === "ok" ? (i === 4 ? "Retried, synced" : "Synced") : t === "bad" ? "Failed" : "Delivering"}</Chip>}</span>
          </div>
        ))}
      </div>
      <div className="pa-foot"><span className="pa-note"><Webhook aria-hidden />{step >= 7 ? "Retry succeeded. Calendar updated." : "Webhooks delivered through one operational layer"}</span></div>
    </AppShell>
  );
}
