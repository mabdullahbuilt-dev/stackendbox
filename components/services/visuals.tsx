import { BarChart3, Blocks, Bot, Check, CircleAlert, Database, FileText, Link2, Lock, Search, ShieldCheck, UserRound, Wallet, Wrench } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";

/**
 * Nine service scenes. Each takes `n`, the current script step. n === TOTAL[id] is the finished composition,
 * which is also the resting state, the reduced-motion state and what touch visitors see.
 * Each scene has its own layout and its own verb so no two read as the same dashboard.
 */
export const TOTAL = { saas: 8, web: 8, custom: 7, ai: 7, automation: 4, crm: 6, api: 7, web3: 8, trading: 7 } as const;
type V = { n: number };

/* 01 SaaS: ASSEMBLE, DOCK, REFLOW, VERIFY, GO LIVE */
export function SaasVisual({ n }: V) {
  return (
    <div className="v v-saas" data-n={n}>
      <div className="v-saas__phone" data-on={n >= 7}><span /><i /><i /><b /></div>
      <div className="v-saas__win" data-fill={n >= 2}>
        <div className="v-bar"><i /><i /><i /><b>Workspace</b><em className="v-live" data-on={n >= 8}><u />LIVE</em></div>
        <div className="v-saas__body">
          <aside data-on={n >= 1}><i data-act /><i /><i /></aside>
          <div><div className="v-tiles"><s /><s data-hi /><s /></div><div className="v-bars">{[40, 62, 50, 78, 66, 88].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div></div>
        </div>
      </div>
      <div className="v-chips">
        <span data-on={n >= 3}><Lock aria-hidden />Auth</span>
        <span data-on={n >= 4}><Database aria-hidden />Data</span>
        <span data-on={n >= 5} data-ok><BrandIcon name="stripe" size={12} />Billing<Check aria-hidden /></span>
        <span data-on={n >= 6}><ShieldCheck aria-hidden />Admin</span>
      </div>
    </div>
  );
}

/* 02 Web application: REFLOW, FILTER, EXPAND, COLLAPSE, RESPOND */
export function WebVisual({ n }: V) {
  const bp = n === 6 ? "t" : n === 7 ? "m" : "d";
  const typed = n >= 3 ? "invoice" : n >= 2 ? "inv" : "";
  const rows = [["Invoice 1042", "Paid"], ["Invoice 1043", "Due"], ["Quote 220", "Draft"], ["Invoice 1044", "Paid"]] as const;
  const shown = n >= 3 ? rows.filter((r) => r[0].startsWith("Invoice")) : rows;
  return (
    <div className="v v-web" data-bp={bp} data-n={n}>
      <div className="v-web__frame">
        <nav className="v-web__nav"><i data-act /><i /><i /><i /></nav>
        <div className="v-web__main">
          <div className="v-web__top">
            <span className="v-web__search" data-on={n >= 1}><Search aria-hidden />{typed || "Search"}{n >= 1 && n < 3 && <u className="v-caret" />}</span>
            <span className="v-web__filter" data-on={n >= 4 && n < 5}>Status: Due</span>
          </div>
          <ul className="v-web__list">
            {shown.filter((r) => (n >= 4 ? r[1] === "Due" || r[0] === "Invoice 1042" : true)).slice(0, 3).map(([t, s], i) => (
              <li key={t} data-sel={n >= 5 && i === 0}><span>{t}</span><em>{s}</em></li>
            ))}
          </ul>
        </div>
        <aside className="v-web__drawer" data-open={n >= 5}><b>Invoice 1042</b><p>Acme Co</p><p className="v-web__amt">$4,900</p><i /><i /></aside>
        <div className="v-web__tabs"><i data-act /><i /><i /></div>
      </div>
      <div className="v-bps">{["Desktop", "Tablet", "Mobile"].map((x, i) => <span key={x} data-on={(bp === "d" && i === 0) || (bp === "t" && i === 1) || (bp === "m" && i === 2)}>{x}</span>)}</div>
    </div>
  );
}

/* 03 Custom software: COMPOSE, DOCK, STACK, LOCK, EXPAND (layered planes) */
export function CustomVisual({ n }: V) {
  return (
    <div className="v v-custom" data-n={n}>
      <div className="v-cu__req" data-small={n >= 1}><b className="mono">REQUIREMENT</b><p>Custom platform</p></div>
      <div className="v-cu__plane v-cu__plane--db" data-on={n >= 3}><b className="mono">DATABASE</b><i /><i /><i /></div>
      <div className="v-cu__plane v-cu__plane--logic" data-on={n >= 2}><b className="mono">BUSINESS LOGIC</b><s>if approved then release</s><s>else route to owner</s></div>
      <div className="v-cu__ui" data-on={n >= 1}>
        <div className="v-bar"><i /><i /><i /><b>Platform</b></div>
        <div className="v-cu__body">
          <aside><i data-act /><i /><i /><i /></aside>
          <div className="v-cu__main"><div className="v-cu__table"><i /><i /><i /><i /></div></div>
          <div className="v-cu__insp" data-on={n >= 3}><b className="mono">INSPECTOR</b><i /><i /></div>
        </div>
      </div>
      <div className="v-cu__chip v-cu__chip--perm" data-on={n >= 4}><Lock aria-hidden />Permissions</div>
      <div className="v-cu__chip v-cu__chip--api" data-on={n >= 5}><Link2 aria-hidden />API</div>
      <div className="v-cu__rep" data-on={n >= 6}><BarChart3 aria-hidden /><i /><i /><i /></div>
    </div>
  );
}

/* 04 AI inside software: RETRIEVE, INSPECT, ACT, VERIFY */
export function AiVisual({ n }: V) {
  return (
    <div className="v v-ai" data-n={n}>
      <div className="v-ai__src" data-on={n >= 0}>
        <b className="mono"><FileText aria-hidden />REQUEST</b>
        <p>Refund for order A-1042</p>
        <p data-hit={n >= 1}>Policy: refunds within 30 days</p>
        <p>Delivered 12 days ago</p>
      </div>
      <div className="v-ai__core" data-st={n >= 7 ? "ok" : n >= 2 ? "run" : "idle"}>
        <b className="mono"><Bot aria-hidden />MODEL</b>
        <div className="v-ai__ctx" data-on={n >= 1}><Search aria-hidden />Matched 1 source</div>
        <div className="v-ai__conf" data-on={n >= 4}><span>Confidence</span><s><i style={{ width: n >= 4 ? "92%" : "20%" }} /></s></div>
        <div className="v-ai__appr" data-on={n >= 5}><UserRound aria-hidden />Approved by a person</div>
      </div>
      <div className="v-ai__out">
        <div className="v-ai__tool" data-on={n >= 3} data-ok={n >= 4}><Wrench aria-hidden />Refund issued {n >= 4 && <Check aria-hidden />}</div>
        <div className="v-ai__app" data-on={n >= 6}><b className="mono">TICKET 4821</b><span>{n >= 7 ? "Resolved" : "Updating"}</span></div>
      </div>
    </div>
  );
}

/* 05 Automation: ASSIGN, UPDATE, COMPLETE (kept small on purpose) */
export function AutomationVisual({ n }: V) {
  const states = ["Incoming", "Assigned", "Approval", "Complete"] as const;
  const label = states[Math.min(3, n)];
  return (
    <div className="v v-auto" data-n={n}>
      <div className="v-auto__card">
        <div className="v-bar"><i /><i /><i /><b>Requests</b></div>
        <div className="v-auto__body">
          <div className="v-auto__req">
            <b>Request #1842</b>
            <span className="v-auto__pill" data-st={n >= 4 ? "ok" : n >= 2 ? "run" : "idle"}>{n >= 4 ? "Complete" : label}</span>
          </div>
          <div className="v-auto__meta"><span data-on={n >= 1}><u>PK</u>Priya</span><span data-on={n >= 2} data-ok={n >= 3}><ShieldCheck aria-hidden />{n >= 3 ? "Approved" : "Needs approval"}</span></div>
        </div>
      </div>
      <ul className="v-auto__feed">
        <li data-on>Request received</li>
        <li data-on={n >= 1}>Assigned to Priya</li>
        <li data-on={n >= 3}>Approval granted</li>
        <li data-on={n >= 4} data-ok>Completed, report updated</li>
      </ul>
    </div>
  );
}

/* 06 CRM and internal software: SELECT, FOCUS, ASSIGN, CONTROL, REPORT */
export function CrmVisual({ n }: V) {
  const rows = [["Harbor redesign", "MA"], ["Northwind rollout", n >= 3 ? "SA" : "LE"], ["Atlas migration", "IN"]] as const;
  return (
    <div className="v v-crm" data-n={n}>
      <nav className="v-crm__nav"><i data-act /><i /><i /><i /></nav>
      <div className="v-crm__table">
        {rows.map(([t, o], k) => <div key={t} className="v-crm__row" data-sel={k === 1 && n >= 1}><span>{t}</span><u>{o}</u></div>)}
        <div className="v-crm__rep"><b className="mono">WORKLOAD</b><span>{[44, 58, 36, n >= 6 ? 74 : 50].map((h, k) => <i key={k} style={{ height: `${h}%` }} data-hot={k === 3 && n >= 6} />)}</span></div>
      </div>
      <aside className="v-crm__drawer" data-open={n >= 2}>
        <b>Northwind Ltd</b>
        <div className="v-crm__own"><u>{n >= 3 ? "SA" : "LE"}</u>Owner</div>
        <div className="v-crm__role" data-lead={n >= 4}><Lock aria-hidden />{n >= 4 ? "Project lead" : "Editor"}</div>
        <p data-done={n >= 5}>{n >= 5 ? <Check aria-hidden /> : <i />}Approve scope</p>
        <p className="mono v-crm__audit" data-on={n >= 6}>AUDIT: role changed</p>
      </aside>
    </div>
  );
}

/* 07 APIs and integrations: PARSE, MAP, AUTHENTICATE, WRITE, RESPOND */
export function ApiVisual({ n }: V) {
  return (
    <div className="v v-api" data-n={n}>
      <div className="v-api__logos" aria-hidden><BrandIcon name="stripe" size={14} /><BrandIcon name="hubspot" size={14} /><BrandIcon name="postgres" size={14} /></div>
      <div className="v-api__col">
        <b className="mono">REQUEST</b>
        <div className="v-api__req" data-on><em>POST</em>/v1/events</div>
        <div className="v-api__sig" data-on={n >= 1}><ShieldCheck aria-hidden />Signature verified</div>
      </div>
      <div className="v-api__col v-api__col--mid">
        <b className="mono">PAYLOAD</b>
        <pre data-on={n >= 2}>{`{\n  "type": "payment",\n  "amount": 4900,\n  "customer": "cus_8f2"\n}`}</pre>
        <div className="v-api__map" data-on={n >= 3}><span>amount</span><i>to</i><span>invoice.total</span></div>
        <div className="v-api__map" data-on={n >= 3}><span>customer</span><i>to</i><span>account.id</span></div>
      </div>
      <div className="v-api__col">
        <b className="mono">RESPONSE</b>
        <div className="v-api__res" data-on={n >= 4}>200 OK</div>
        <div className="v-api__db" data-on={n >= 5}><Database aria-hidden />Row written</div>
        <div className="v-api__log mono" data-on={n >= 6}>evt logged</div>
      </div>
    </div>
  );
}

/* 08 Web3 and blockchain: CONNECT, SIGN, SUBMIT, CONFIRM, INDEX */
export function Web3Visual({ n }: V) {
  const st = n >= 6 ? "ok" : n >= 4 ? "run" : "idle";
  return (
    <div className="v v-w3" data-n={n}>
      <div className="v-w3__blocks" aria-hidden>
        {["#18442899", "#18442900", "#18442901"].map((h, i) => <span key={h} data-on={n >= 4 + i * 0.7 || n >= 6} className="mono">{h}</span>)}
      </div>
      <div className="v-w3__wallet" data-on={n >= 0}>
        <b className="mono"><Wallet aria-hidden />ACCOUNT</b>
        <span className="v-w3__addr mono" data-on>0x4f2a…91c</span>
        <span className="v-w3__net" data-on={n >= 1}><u />Testnet</span>
      </div>
      <div className="v-w3__tx" data-lift={n >= 2} data-st={st}>
        <b className="mono">TRANSACTION</b>
        <p data-on={n >= 2}>approve(spender, 250)</p>
        <button type="button" tabIndex={-1} data-on={n >= 2} data-done={n >= 3}>{n >= 3 ? "Signed" : "Sign"}</button>
        <span className="v-w3__status" data-st={st}>{st === "ok" ? "CONFIRMED" : st === "run" ? "PENDING" : "READY"}</span>
      </div>
      <div className="v-w3__idx" data-on={n >= 7}><Blocks aria-hidden /><div><b className="mono">INDEXED EVENT</b><span>Approval, block 18,442,901</span></div></div>
      <div className="v-w3__app" data-on={n >= 8}><Check aria-hidden />Balance and history updated</div>
    </div>
  );
}

/* 09 Trading, market and data: STREAM, COMPARE, TRIGGER, ANALYZE, ALERT */
export function TradingVisual({ n }: V) {
  const rows: [string, number, string][] = [["ALP", 71.2, "+1.4"], ["BRV", 48.9, "-0.6"], ["CRN", 52.4, "+0.2"], ["DLT", n >= 3 ? 72.1 : 66.4, "+2.1"], ["EPS", 33.8, "-1.1"]];
  const pts = [38, 40, 39, 43, 46, 45, 50, 53, 52, 58, 61, 64, 67, 71, 74];
  const upto = n >= 1 ? 15 : 11;
  const d = pts.slice(0, upto).map((v, i) => `${i ? "L" : "M"}${(i / 14) * 100},${60 - v * 0.7}`).join(" ");
  return (
    <div className="v v-tr mono" data-n={n}>
      <div className="v-tr__watch">{rows.map(([s, p, c], i) => <div key={s} data-hot={i === 3 && n >= 4} data-flash={n === 0 && i < 3}><span>{s}</span><em>{p.toFixed(1)}</em><u data-neg={c.startsWith("-")}>{c}</u></div>)}</div>
      <div className="v-tr__chart">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0,34 L14,32 L28,36 L42,28 L56,30 L70,22 L84,24 L100,18" className="v-tr__hist" />
          <line x1="0" x2="100" y1="14" y2="14" className="v-tr__th" data-on={n >= 2} />
          <path d={d} className="v-tr__live" data-hot={n >= 3} />
        </svg>
        <span className="v-tr__thl" data-on={n >= 2}>THRESHOLD</span>
        <div className="v-tr__alert" data-on={n >= 5}><CircleAlert aria-hidden />DLT crossed 70</div>
      </div>
      <div className="v-tr__side">
        <div className="v-tr__rule" data-on={n >= 3}><b>RULE</b><span>&gt; 70 x3</span><i data-hot={n >= 3}>{n >= 3 ? "TRIGGERED" : "WATCH"}</i></div>
        <div className="v-tr__risk" data-on={n >= 6}><b>RISK</b><span>Within limits</span></div>
        <ul className="v-tr__log"><li data-on>feed ok</li><li data-on={n >= 3}>rule fired</li><li data-on={n >= 7}>alert logged</li></ul>
      </div>
    </div>
  );
}

export const visuals = { saas: SaasVisual, web: WebVisual, custom: CustomVisual, ai: AiVisual, automation: AutomationVisual, crm: CrmVisual, api: ApiVisual, web3: Web3Visual, trading: TradingVisual } as const;

