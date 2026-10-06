"use client";
import { Blocks, Check, ClipboardList, Database, Gauge, LayoutTemplate, PackageCheck, PenTool, Plug, Rocket, ShieldCheck, Smartphone, Target, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChapterStep } from "@/lib/chapters";
import { copy } from "@/content/copy";
import { steps } from "@/content/process";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";
import { Aperture } from "@/components/site/Aperture";

const OUT: [string, number][] = [["Requirements", 0], ["User flow", 1], ["Wireframes", 1], ["Interface", 2], ["API", 2], ["Data model", 2], ["Test suite", 3], ["Release", 4], ["Monitoring", 4]];
const icons: LucideIcon[] = [Target, PenTool, Blocks, ShieldCheck, PackageCheck];

const W_ICONS = { users: Users, clip: ClipboardList, target: Target, plug: Plug };
/** The working space beside the artifact: what the team actually produces at each stage. Fills the bench, no empty frame. */
function Workspace({ stage, fix }: { stage: number; fix: boolean }) {
  return (
    <div className="wb__space" key={stage} data-s={stage}>
      {stage === 0 && (<>
        <div className="wbs wbs--users"><b className="mono">WHO USES IT</b><ul><li><W_ICONS.users />Clients</li><li><W_ICONS.users />Account managers</li><li><W_ICONS.users />Finance</li></ul></div>
        <div className="wbs wbs--today"><b className="mono">HOW IT WORKS TODAY</b><ol><li>Email request</li><li>Spreadsheet</li><li>Invoice by hand</li></ol></div>
        <div className="wbs"><b className="mono">CONSTRAINTS</b><ul className="wbs__tags"><li>Company sign-in</li><li>Stripe payments</li><li>Audit trail</li><li>Mobile first</li></ul></div>
        <div className="wbs wbs--goal"><b className="mono">OUTCOME</b><p>Clients raise and pay requests without email threads. Finance sees every invoice in one place.</p></div>
      </>)}
      {stage === 1 && (<>
        <div className="wbs wbs--wide"><b className="mono">USER FLOW</b><ol className="wbs__flow"><li>Sign in</li><li>New request</li><li>Approve</li><li>Pay</li><li>Receipt</li></ol></div>
        <div className="wbs wbs--wide"><b className="mono">SYSTEM MAP</b><div className="wbs__map"><span>Client portal</span><i /><span>API</span><i /><span>Database</span><em>Stripe</em><em>Email</em><em>Admin</em></div></div>
      </>)}
      {stage === 2 && (<>
        <div className="wbs"><b className="mono">COMPONENTS</b><ul className="wbs__code"><li>RequestForm</li><li>InvoiceTable</li><li>PaymentSheet</li><li>AdminConsole</li></ul></div>
        <div className="wbs"><b className="mono">API</b><ul className="wbs__code"><li><em>POST</em> /requests</li><li><em>GET</em> /invoices</li><li><em>POST</em> /payments/webhook</li><li><em>GET</em> /audit</li></ul></div>
        <div className="wbs wbs--wide"><b className="mono">DATA MODEL</b><div className="wbs__tables"><span>clients</span><span>requests</span><span>invoices</span><span>audit_log</span></div></div>
      </>)}
      {stage === 3 && (
        <div className="wbs wbs--wide wbs--matrix"><b className="mono">TEST MATRIX</b>
          <table><thead><tr><th /><th>Desktop</th><th>Tablet</th><th>Mobile</th></tr></thead>
            <tbody>{["Interface", "API", "Permissions", "Empty state"].map((r) => <tr key={r}><th>{r}</th>{[0, 1, 2].map((c) => { const bad = r === "Empty state" && c === 2 && !fix; return <td key={c} data-t={bad ? "bad" : "ok"}>{bad ? <TriangleAlert aria-label="caught" /> : <Check aria-label="passed" />}</td>; })}</tr>)}</tbody>
          </table>
          <p data-t={fix ? "ok" : "bad"}>{fix ? "Empty state on mobile fixed, all checks passing" : "Caught: empty request list breaks the mobile layout"}</p>
        </div>
      )}
      {stage === 4 && (<>
        <div className="wbs wbs--goal"><b className="mono">RELEASE</b><p>Client portal v1.0 is live. Deploys are repeatable and can be rolled back.</p></div>
        <div className="wbs"><b className="mono">RUNNING</b><ul className="wbs__ok"><li><Check />Health checks</li><li><Check />Error tracking</li><li><Check />Alerts to the team</li><li><Check />Backups</li></ul></div>
        <div className="wbs"><b className="mono">NEXT</b><ul className="wbs__tags"><li>Usage review</li><li>Iteration plan</li></ul></div>
      </>)}
    </div>
  );
}

/**
 * One artifact evolves through five stages: brief, flow and wireframe, working product,
 * tests (with one caught and fixed issue), then a deployment that goes live.
 */
export function Process() {
  const { reduced } = useMotionPreference();
  // Scroll drives one artifact through the bench and back: discover, design, build, verify (issue caught), verify (fixed), ship.
  const raw = useChapterStep("process", 6);
  const [pickd, setPickd] = useState<{ i: number; at: number } | null>(null);
  const s6 = reduced ? 5 : raw;
  const stage = pickd && pickd.at === raw ? pickd.i : [0, 1, 2, 3, 3, 4][s6];
  const fix = pickd && pickd.at === raw ? pickd.i > 3 : s6 >= 4;
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  // Measurement guide that follows the pointer over the workbench only (one rAF, fine pointer, no particles).
  useEffect(() => {
    const el = box.current;
    if (!el || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => { raf = 0; el.style.setProperty("--gx", `${x}px`); el.style.setProperty("--gy", `${y}px`); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top; el.dataset.guide = "on"; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { el.dataset.guide = "off"; };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);
  const pick = (i: number) => setPickd({ i, at: raw });
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") i = Math.min(4, stage + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") i = Math.max(0, stage - 1);
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };
  const on = (n: number) => stage >= n;
  const cur = steps[stage];

  return (
    <section id="process" className="proc" data-scroll="pin" aria-labelledby="process-title">
      <div className="proc__sticky">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.process.eyebrow}</p>
          <h2 id="process-title" className="h2">{copy.process.title}</h2>
        </Reveal>
        <div className="wbx">
          <div className="wbx__tabs" role="tablist" aria-label="How we build" onKeyDown={onKey}>
            {steps.map((s, i) => {
              const Ic = icons[i];
              const st = stage > i ? "done" : stage === i ? "active" : "idle";
              return (
                <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`px-${s.id}`} aria-selected={stage === i} aria-controls="px-panel" tabIndex={stage === i ? 0 : -1} className="pxg__tab" data-st={st} onClick={() => pick(i)}>
                  <span className="pxg__ic">{st === "done" ? <Check aria-label="done" /> : <Ic aria-hidden />}</span>
                  <span className="mono">{s.n}</span><b>{s.word}</b>
                </button>
              );
            })}
          </div>
          <p className="pxg__line" aria-live="polite">{cur.line}</p>
          <div id="px-panel" role="tabpanel" aria-labelledby={`px-${cur.id}`} className="wb" ref={box} data-s={stage} style={{ ["--z" as string]: stage }}>
            <div className="wb__bench" aria-hidden>
              <i className="wb__guide wb__guide--x" /><i className="wb__guide wb__guide--y" />
              <div className="wb__rule" />
              <ul className="wb__out mono" aria-hidden>
                {OUT.map(([t, at]) => <li key={t} data-on={stage >= at}>{stage >= at ? <Check /> : null}{t}</li>)}
              </ul>
              <div className="wb__body">
              <div className="wb__art">
                <div className="wb__face wb__face--note" data-on={stage === 0}><span className="mono">BRIEF</span><p>Client portal: accounts, requests, payments, admin</p>
                  <div className="px-reqs">{[[Users, "Users"], [Plug, "Systems"], [ClipboardList, "Rules"]].map(([Ic, t]) => { const I = Ic as LucideIcon; return <span key={t as string}><I />{t as string}</span>; })}</div>
                </div>
                <div className="wb__face wb__face--wire" data-on={stage === 1}>
                  <div className="wb__flow">{["Sign in", "Request", "Pay"].map((t) => <span key={t}>{t}</span>)}</div>
                  <div className="wb__wf"><u /><u /><u /><s /></div>
                </div>
                <div className="wb__face wb__face--ui" data-on={stage >= 2}>
                  <div className="px-win__bar"><i /><i /><i /><b className="mono">Client portal</b></div>
                  <div className="wb__ui"><u /><u /><u /><button type="button" tabIndex={-1}>Submit request</button></div>
                  <div className="wb__chips" data-on={stage >= 2}><span><Database />Data</span><span><Plug />API</span><span><LayoutTemplate />UI</span><span><Smartphone />Mobile</span></div>
                </div>
                <div className="wb__test" data-on={stage === 3}>
                  <b className="mono">CHECKS</b>
                  {[["Interface", "ok"], ["API", "ok"], ["Responsive", "ok"], ["Empty state", fix ? "ok" : "bad"]].map(([t, s]) => (
                    <span key={t} data-t={s}>{s === "ok" ? <Check aria-hidden /> : <TriangleAlert aria-hidden />}{t}{s === "bad" ? " (caught)" : t === "Empty state" ? " (fixed)" : ""}</span>
                  ))}
                </div>
                <div className="wb__live" data-on={stage === 4}><strong><Rocket />LIVE</strong><em><Gauge />Monitoring on</em></div>
              </div>
              <Workspace stage={stage} fix={fix} />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Aperture kind="live" />
    </section>
  );
}
