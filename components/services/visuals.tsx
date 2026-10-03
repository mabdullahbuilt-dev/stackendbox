"use client";
import { Bot, Check, CircleAlert, Database, FileText, Lock, Search, ShieldCheck, UserCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";

/**
 * Service scenes. The resting state is the finished composition (also what reduced motion sees).
 * `play` adds the .sv--play class, which runs each element's one-shot animation once and then settles.
 */
const D = (i: number) => ({ ["--i" as string]: i });

/** Resting state is the finished scene (n = total). When `play` turns on it runs 0..total once, then rests. */
function useStages(play: boolean | undefined, total: number, ms: number) {
  const [n, setN] = useState(total);
  useEffect(() => {
    if (!play) return;
    let k = 0;
    setN(0);
    const id = setInterval(() => { k += 1; setN(k); if (k >= total) clearInterval(id); }, ms);
    return () => clearInterval(id);
  }, [play, total, ms]);
  return n;
}

export function SaasVisual({ play }: { play?: boolean }) {
  const n = useStages(play, 7, 420);
  return (
    <div className="sv sv-saas" data-n={n}>
      <div className="sv-win">
        <div className="sv-win__bar"><i /><i /><i /><b>Workspace</b><em className="sv-live" data-on={n >= 7}><u />LIVE</em></div>
        <div className="sv-win__body" data-ui={n >= 1}>
          <aside><i data-act /><i /><i /></aside>
          <div className="sv-wf"><div className="sv-tiles"><s /><s data-hi /><s /></div><div className="sv-bars">{[40, 62, 50, 78, 66, 88].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div></div>
        </div>
      </div>
      <div className="sv-phone" data-on={n >= 6}><span /><i /><i /><b /></div>
      <div className="sv-adm" data-on={n >= 5}><ShieldCheck aria-hidden />Admin</div>
      <div className="sv-chips">
        <span data-on={n >= 2}><Lock aria-hidden />Auth</span>
        <span data-on={n >= 3}><Database aria-hidden />Data</span>
        <span data-on={n >= 4} data-ok><BrandIcon name="stripe" size={13} />Billing<Check aria-hidden /></span>
      </div>
    </div>
  );
}

export function WebVisual({ play }: { play?: boolean }) {
  const [bp, setBp] = useState(0);
  // plays desktop > tablet > mobile > desktop once; the resting state is desktop
  useEffect(() => {
    if (!play) return;
    const t = [setTimeout(() => setBp(1), 500), setTimeout(() => setBp(2), 1500), setTimeout(() => setBp(0), 2600)];
    return () => t.forEach(clearTimeout);
  }, [play]);
  const names = ["Desktop", "Tablet", "Mobile"];
  return (
    <div className="sv sv-web" data-bp={bp}>
      <div className="sv-bps">{names.map((n, i) => <span key={n} data-on={bp === i}>{n}</span>)}</div>
      <div className="sv-frame">
        <div className="sv-frame__bar"><i /><i /><i /></div>
        <div className="sv-frame__body">
          <nav><i /><i /><i /></nav>
          <div className="sv-grid">{[0, 1, 2, 3].map((k) => <div key={k} className={`sv-gc sv-gc--${k}`}><u /><s /></div>)}</div>
        </div>
      </div>
    </div>
  );
}

export function AiVisual(_: { play?: boolean }) {
  const nodes = [[FileText, "Input"], [Search, "Context"], [Bot, "Model"], [Wrench, "Tool"], [UserCheck, "Approve"]] as const;
  return (
    <div className="sv sv-ai">
      <div className="sv-flow">
        {nodes.map(([Ic, t], k) => (
          <div key={t} className={`sv-node sv-node--${k}`} style={D(k)}><span><Ic aria-hidden /></span><b>{t}</b></div>
        ))}
      </div>
      <div className="sv-conf" style={D(5)}><b className="mono">CONFIDENCE</b><span><i /></span><em className="mono sv-conf__a"><CircleAlert aria-hidden />REVIEW</em><em className="mono sv-conf__b"><Check aria-hidden />APPROVED</em></div>
      <div className="sv-done" style={D(6)}><Check aria-hidden />Action executed</div>
    </div>
  );
}

export function AutomationVisual(_: { play?: boolean }) {
  const steps = ["Received", "Classified", "Assigned", "Approved", "Updated", "Done"];
  return (
    <div className="sv sv-auto">
      <div className="sv-obj"><b>Request #1842</b></div>
      <div className="sv-track">
        {steps.map((s, k) => <div key={s} className="sv-st" style={D(k)}><i><Check aria-hidden /></i><b>{s}</b></div>)}
      </div>
    </div>
  );
}

export function CrmVisual({ play }: { play?: boolean }) {
  const n = useStages(play, 5, 520);
  const rows = [["Harbor redesign", "M"], ["Northwind rollout", "L"], ["Atlas migration", "I"]] as const;
  return (
    <div className="sv sv-crm" data-n={n}>
      <nav className="sv-cn"><i data-act /><i /><i /><i /></nav>
      <div className="sv-ct">
        {rows.map(([t, o], k) => <div key={t} className="sv-cr" data-sel={k === 1 && n >= 1}><span>{t}</span><u>{k === 1 && n >= 3 ? "S" : o}</u></div>)}
        <div className="sv-crep"><span><i style={{ width: n >= 5 ? "82%" : "64%" }} data-hot={n >= 5} /></span><em className="mono">REPORT</em></div>
      </div>
      <aside className="sv-cd" data-open={n >= 2}>
        <b>Northwind Ltd</b>
        <div className="sv-role" data-lead={n >= 4}><Lock aria-hidden />{n >= 4 ? "Project lead" : "Editor"}</div>
        <p data-done={n >= 5}>{n >= 5 ? <Check aria-hidden /> : <i />}Approve scope</p>
        <p className="mono sv-audit" data-on={n >= 5}>AUDIT: LOGGED</p>
      </aside>
    </div>
  );
}

export function ApiVisual({ play }: { play?: boolean }) {
  const n = useStages(play, 6, 480);
  return (
    <div className="sv sv-api" data-n={n}>
      <div className="sv-req2"><em className="mono">POST</em><b className="mono">/v1/payments/webhook</b><i data-on={n >= 3}>200 OK</i></div>
      <div className="sv-pay mono" data-on={n >= 1}>
        <p><span>type</span><em>payment.completed</em></p>
        <p data-map={n >= 2}><span>amount</span><em>4900</em><u>to invoice.total</u></p>
        <p data-map={n >= 2}><span>customer</span><em>cus_8f2</em><u>to account.id</u></p>
      </div>
      <div className="sv-db" data-on={n >= 4}><Database aria-hidden />Row written<Check aria-hidden /></div>
      <div className="sv-retry mono" data-on={n >= 5}>RETRY 0 · SIGNATURE VERIFIED</div>
    </div>
  );
}

export function CustomVisual({ play }: { play?: boolean }) {
  const [m, setM] = useState(0);
  // plays market, web3, developer tool once and rests on the first
  useEffect(() => {
    if (!play) return;
    const t = [setTimeout(() => setM(1), 1100), setTimeout(() => setM(2), 2200), setTimeout(() => setM(0), 3300)];
    return () => t.forEach(clearTimeout);
  }, [play]);
  const names = ["Market data", "Web3", "Developer tools"];
  return (
    <div className="sv sv-custom" data-m={m}>
      <div className="sv-modes">{names.map((x, i) => <span key={x} data-on={m === i}>{x}</span>)}</div>
      <div className="sv-cv sv-cv--0" data-on={m === 0}>
        <svg viewBox="0 0 120 40" preserveAspectRatio="none"><path d="M0,30 L20,26 L40,28 L60,18 L80,20 L100,10 L120,6" /><line x1="0" x2="120" y1="12" y2="12" /></svg>
        <em className="mono">ALERT</em>
      </div>
      <div className="sv-cv sv-cv--1" data-on={m === 1}>
        {["Wallet", "Request", "Confirmed", "Indexed"].map((t, i) => <span key={t} style={{ ["--k" as string]: i }}>{t}</span>)}
      </div>
      <div className="sv-cv sv-cv--2" data-on={m === 2}>
        <pre><i data-d="del">- heavy-lib 4.2</i>{"\n"}<i data-d="add">+ light-lib 1.1</i></pre>
        <em className="mono">TESTS PASS</em>
      </div>
    </div>
  );
}
