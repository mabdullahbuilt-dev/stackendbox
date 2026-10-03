import { Check, X } from "lucide-react";
import { Line, Pill } from "@/components/ui/mock";

/** Five stage visuals. Pure DOM; entrance sequencing via CSS animation-delay (disabled under reduced motion). */
export const processVisuals: Record<string, React.ReactNode> = {
  discover: (
    <div className="pv pv-discover">
      <div className="pv-card"><b className="mono">Brief.md</b><Line w="85%" tone="strong" /><Line w="70%" /><Line w="55%" /></div>
      <div className="pv-chips"><span className="chip">Who is it for?</span><span className="chip">What does done look like?</span><span className="chip">What exists today?</span></div>
      <ul className="pv-list">{["Users and roles named", "Success criteria agreed", "Constraints written down"].map((t, i) => <li key={t} style={{ ["--d" as string]: `${i * 220}ms` }}><Check />{t}</li>)}</ul>
    </div>
  ),
  design: (
    <div className="pv pv-design">
      <div className="pv-plates">{["Interface", "Logic", "Data", "Integrations"].map((t, i) => <div key={t} className="pv-plate mono" style={{ ["--d" as string]: `${i * 140}ms`, ["--r" as string]: `${[-3, 2, -2, 3][i]}deg` }}>{t}</div>)}</div>
      <div className="pv-wire"><i /><i /><i /><i /></div>
    </div>
  ),
  build: (
    <div className="pv pv-build">
      <div className="pv-ui"><div className="mk-row"><b>Bookings</b><Pill tone="cyan">New feature</Pill></div><div className="pv-ui__rows"><Line w="90%" /><Line w="75%" /><Line w="82%" /></div></div>
      <div className="pv-status"><span className="mono">BUILD</span><span className="pv-amber"><Pill tone="amber">RUNNING</Pill></span><span className="pv-green"><Pill tone="green">PASSED</Pill></span></div>
    </div>
  ),
  verify: (
    <div className="pv pv-verify">
      {["Unit tests", "Edge cases", "Failure states", "Accessibility", "Load check"].map((t, i) => (
        <div key={t} className="pv-test" data-fail={i === 2 ? "true" : undefined} style={{ ["--d" as string]: `${i * 380}ms` }}>
          <span className="pv-test__ic"><Check className="ok" /><X className="bad" /></span><span>{t}</span>
          <span className="pv-test__s mono">{i === 2 ? "fixed" : "pass"}</span>
        </div>
      ))}
    </div>
  ),
  ship: (
    <div className="pv pv-ship">
      <div className="pv-card"><div className="mk-row"><b className="mono">Deploy</b><span className="pv-live"><Pill tone="green">LIVE</Pill></span></div><Line w="70%" /><span className="mk-sub">Production build passed</span></div>
      <div className="pv-card"><b className="mono">Monitoring</b><div className="pv-mon">{[40, 55, 48, 62, 52, 58, 50, 64].map((h, i) => <i key={i} style={{ height: `${h}%`, ["--d" as string]: `${i * 60}ms` }} />)}</div></div>
    </div>
  ),
};
