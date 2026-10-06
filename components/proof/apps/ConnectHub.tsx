import { BrandIcon } from "@/components/ui/BrandIcon";
import type { BrandKey } from "@/content/brandIcons";

export const CONNECTHUB_STEPS = 7;
const SRC: [BrandKey, string][] = [["stripe", "Stripe"], ["hubspot", "HubSpot"], ["gcal", "Calendar"]];
const DST: [BrandKey, string][] = [["postgres", "PostgreSQL"], ["whatsapp", "WhatsApp"], ["gmail", "Gmail"]];
const Y = [22, 50, 78];
/** Which route is live at each step: [source index, destination index]. */
const ROUTE: [number, number][] = [[0, 0], [0, 0], [1, 0], [1, 2], [2, 1], [2, 1], [0, 2], [0, 2]];

/** Integration routing as a live graph: each event takes one lit route through the hub. One retry turns red, then green. */
export function ConnectHub({ step }: { step: number }) {
  const [si, di] = ROUTE[Math.min(step, ROUTE.length - 1)];
  const retry = step === 4;
  const events = ["payment.completed → postgres", "contact.updated → postgres", "contact.updated → gmail", "event.created → whatsapp (retry 1)", "event.created → whatsapp", "payment.completed → gmail"];
  return (
    <div className="bw bw-hub">
      <header className="bw-top"><b><i className="bw-dot" />ConnectHub</b><span>Routing · 6 systems</span><em data-ok={step >= 6}>{retry ? "RETRYING" : "ALL SYNCED"}</em></header>
      <div className="bw-graph">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {Y.map((y, i) => <line key={`s${i}`} x1="22" y1={y} x2="50" y2="50" data-on={i === si} data-bad={retry && i === si} />)}
          {Y.map((y, i) => <line key={`d${i}`} x1="50" y1="50" x2="78" y2={y} data-on={i === di} data-bad={retry && i === di} />)}
        </svg>
        {SRC.map(([k, t], i) => <span key={k} className="bw-node bw-node--l" style={{ top: `${Y[i]}%` }} data-on={i === si}><BrandIcon name={k} size={18} /><b>{t}</b></span>)}
        <span className="bw-core" data-bad={retry}><b>ConnectHub</b><em className="mono">MAP · VERIFY · RETRY</em></span>
        {DST.map(([k, t], i) => <span key={k} className="bw-node bw-node--r" style={{ top: `${Y[i]}%` }} data-on={i === di}><BrandIcon name={k} size={18} /><b>{t}</b></span>)}
      </div>
      <ol className="bw-log mono">{events.map((e, i) => <li key={e} data-on={step > i} data-bad={i === 3 && step === 4}>{e}</li>)}</ol>
    </div>
  );
}
