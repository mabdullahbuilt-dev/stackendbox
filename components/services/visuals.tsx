"use client";
import { Bot, Boxes, CandlestickChart, Check, CircleAlert, Database, FileText, Lock, Plug, Search, Terminal, UserCheck, Wallet, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";

/**
 * Service scenes. The resting state is the finished composition (also what reduced motion sees).
 * `play` adds the .sv--play class, which runs each element's one-shot animation once and then settles.
 */
const D = (i: number) => ({ ["--i" as string]: i });

export function SaasVisual(_: { play?: boolean }) {
  return (
    <div className="sv sv-saas">
      <div className="sv-win" style={D(0)}>
        <div className="sv-win__bar"><i /><i /><i /><b>Workspace</b><em className="sv-live"><u />LIVE</em></div>
        <div className="sv-win__body">
          <aside><i data-act /><i /><i /></aside>
          <div><div className="sv-tiles"><s /><s data-hi /><s /></div><div className="sv-bars">{[40, 62, 50, 78, 66, 88].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div></div>
        </div>
      </div>
      <div className="sv-phone" style={D(2)}><span /><i /><i /><b /></div>
      <div className="sv-chips">
        <span style={D(3)}><Lock aria-hidden />Sign in</span>
        <span style={D(4)} data-ok><BrandIcon name="stripe" size={13} />Pro active<Check aria-hidden /></span>
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

export function CrmVisual(_: { play?: boolean }) {
  return (
    <div className="sv sv-crm">
      <div className="sv-rec" style={D(0)}>
        <div className="sv-rec__h"><span className="sv-av">N</span><div><b>Northwind Ltd</b><em>Account</em></div><span className="sv-stage" style={D(2)}>Active</span></div>
        <div className="sv-owner" style={D(1)}><span className="sv-av sv-av--o">S</span>Owner: Sam</div>
        <div className="sv-task" style={D(3)}><i><Check aria-hidden /></i>Send proposal</div>
      </div>
      <div className="sv-act">
        {["Call logged", "Task created", "Stage updated"].map((t, k) => <p key={t} style={D(4 + k)}><u />{t}</p>)}
      </div>
      <div className="sv-rep" style={D(7)}>{[36, 54, 44, 70, 62].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div>
    </div>
  );
}

export function ApiVisual(_: { play?: boolean }) {
  return (
    <div className="sv sv-api">
      <i className="sv-ln sv-ln--a" /><i className="sv-ln sv-ln--b" /><i className="sv-ln sv-ln--c" />
      <div className="sv-sys sv-sys--s"><BrandIcon name="stripe" size={24} /><b>Stripe</b></div>
      <div className="sv-hub"><Plug aria-hidden /></div>
      <div className="sv-sys sv-sys--h" style={D(3)}><BrandIcon name="hubspot" size={24} /><b>HubSpot</b><Check className="sv-ok" aria-label="connected" /></div>
      <div className="sv-sys sv-sys--p" style={D(4)}><BrandIcon name="postgres" size={24} /><b>PostgreSQL</b><Check className="sv-ok" aria-label="connected" /></div>
      <div className="sv-sys sv-sys--c" style={D(5)}><BrandIcon name="gcal" size={24} /><b>Calendar</b><Check className="sv-ok" aria-label="connected" /></div>
      <span className="sv-pkt sv-pkt--a" /><span className="sv-pkt sv-pkt--b" /><span className="sv-pkt sv-pkt--c" />
      <span className="sv-evt mono">payment.completed</span>
    </div>
  );
}

export function CustomVisual(_: { play?: boolean }) {
  const mods = ["Interface", "API", "Data", "Rules", "AI", "Integration"];
  const ex = [[CandlestickChart, "Market tools"], [Wallet, "Web3 systems"], [Terminal, "Developer tools"], [Database, "Data products"], [Boxes, "Operations software"]] as const;
  return (
    <div className="sv sv-custom">
      <div className="sv-req" style={D(0)}><b className="mono">REQUEST</b><p>A tool that off the shelf software does not cover</p></div>
      <div className="sv-mods">{mods.map((m, k) => <span key={m} style={D(k + 1)}><Lock aria-hidden />{m}</span>)}</div>
      <ul className="sv-ex" aria-label="Examples of specialized software">{ex.map(([Ic, t], k) => <li key={t} style={D(k + 7)}><Ic aria-hidden />{t}</li>)}</ul>
    </div>
  );
}
