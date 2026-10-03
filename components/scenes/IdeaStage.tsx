import { Check, KeyRound, Lock } from "lucide-react";
import { Avatar, Bars, Line, Pill, Tile } from "@/components/ui/mock";

/** Design-space (760×470) layers for "brief → working product". Animated by GSAP (see IdeaToProduct). */
export function IdeaStage() {
  return (
    <div className="ip">
      {/* 01 BRIEF + low-fi fragments */}
      <div className="ip-frag ip-flow" data-lo>
        {[1, 2, 3, 4, 5].map((n) => <i key={n}>{n}</i>)}
      </div>
      <div className="ip-frag ip-schemachip mono" data-lo>users · plans · bookings</div>
      <div className="ip-frag ip-apichip mono" data-lo>{`{ "status": "ok" }`}</div>
      <div className="ip-frag ip-pay" data-lo><span className="mono">PAYMENT</span><Line w="60%" /></div>
      <div className="ip-frag ip-aiblock" data-lo><span className="mono">AI BLOCK</span><Line w="70%" /></div>
      <div className="ip-brief">
        <div className="mk-row"><b className="mono">Brief.md</b><Pill>DRAFT</Pill></div>
        <ul>
          <li>Customers book and pay online</li>
          <li>Staff manage bookings</li>
          <li>Admin sees reports</li>
          <li>Mobile first</li>
        </ul>
      </div>
      <div className="ip-briefdone mono" data-done><Check className="mk-inl" /> Brief</div>

      {/* admin sits behind-right */}
      <div className="ip-admin">
        <div className="window__bar"><span className="window__title">Admin · Users</span></div>
        <div className="ip-admin__rows">{["Maya Chen · Owner", "Sam Ortiz · Editor", "Riya Das · Viewer", "Alex Kim · Editor"].map((u) => <div key={u} className="mk-trow"><Avatar>{u[0]}</Avatar><span>{u}</span></div>)}</div>
        <span className="ip-cap mono">ADMIN</span>
      </div>
      {/* data layer behind the window */}
      <div className="ip-schema">
        <div className="mk-row"><b className="mono">SCHEMA</b><Pill tone="cyan">postgres</Pill></div>
        <div className="ip-tables">
          {[["users", 8], ["plans", 4], ["bookings", 11], ["invoices", 7]].map(([t, n]) => <div key={t}><b className="mono">{t}</b><span className="mono mono--muted">{n} cols</span></div>)}
        </div>
      </div>

      {/* wireframe → interface */}
      <div className="ip-win ip-wire">
        <div className="ip-wire__in">
          <i className="wb wb--side" /><i className="wb wb--h" />
          <i className="wb wb--t" /><i className="wb wb--t" /><i className="wb wb--t" />
          <i className="wb wb--big" /><i className="wb wb--row" /><i className="wb wb--row" />
        </div>
      </div>
      <div className="ip-win ip-ui window">
        <div className="window__bar">
          <span className="window__dots" aria-hidden><i /><i /><i /></span>
          <span className="window__title">Workspace</span>
          <span className="ip-live" style={{ marginLeft: "auto" }}><Pill tone="green">LIVE</Pill><span className="mono mono--muted"><Check className="mk-inl" /> Production build</span></span>
        </div>
        <div className="mk-app">
          <aside><span className="mono">N</span><Lock /><Lock /><Lock /></aside>
          <div className="mk-app__main">
            <div className="mk-row"><b>Overview</b><Pill tone="cyan">SAMPLE</Pill></div>
            <div className="mk-tiles"><Tile label="MEMBERS" value="8" /><Tile label="PROJECTS" value="24" tone="cyan" /><Tile label="SEATS" value="8/10" /></div>
            <Bars values={[30, 44, 36, 58, 50, 72, 64, 86]} />
          </div>
        </div>
      </div>
      <i className="ip-edge" />

      {/* docked parts */}
      <div className="ip-auth ip-part"><span className="mk-mini__ic"><KeyRound /></span><span><b>Sign in</b><em className="mono">ACCESS · ROLES</em></span></div>
      <div className="ip-api ip-part"><span className="mono mono--muted">API · GET /bookings</span><span className="mono ip-api__code">{`{ "status": `}<b>200</b>{` }`}</span><Line w="80%" /><Line w="55%" /></div>
      <div className="ip-bill ip-part"><span className="mono mono--muted">BILLING</span><div className="mk-row"><b>Pro</b><Pill tone="green">Subscription · active</Pill></div></div>
    </div>
  );
}
