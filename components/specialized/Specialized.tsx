"use client";
import { ArrowRight, Boxes, Check, CircleAlert, FileCode2, FolderTree, GitBranch, Rocket, ShieldCheck, Terminal, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { useScript } from "@/lib/useScript";
import { Reveal } from "@/components/ui/Reveal";

const MODES = [
  { id: "market", tab: "Market and data", icon: Terminal, steps: 6, line: "Data feeds, rules and alerts in one dense, fast application." },
  { id: "web3", tab: "Web3", icon: Wallet, steps: 5, line: "Wallet, transaction, confirmation and indexed state, built as ordinary reliable software." },
  { id: "dev", tab: "Developer tools", icon: Boxes, steps: 6, line: "Repository analysis, findings, fixes and deployment in one technical product." },
] as const;

const SERIES = [[38, 40, 39, 43, 46, 45, 50, 53, 52, 58, 61, 64, 67, 71, 74, 78]] as const;

function pathFor(n: number) {
  const pts = SERIES[0].slice(0, Math.max(2, n));
  return pts.map((v, i) => `${i ? "L" : "M"}${(i / 15) * 300},${100 - v}`).join(" ");
}

function Market({ s }: { s: number }) {
  const rows = [["ALP", 71.2, "+1.4"], ["BRV", 48.9, "-0.6"], ["CRN", 52.4, "+0.2"], ["DLT", 64.1, "+2.1"], ["EPS", 33.8, "-1.1"], ["FRX", 58.0, "+0.4"]] as const;
  const crossed = s >= 3;
  return (
    <div className="spc-mkt">
      <div className="spc-mkt__watch"><b className="mono">WATCHLIST</b>
        {rows.map(([n, v, c], i) => <div key={n} data-hot={i === 3 && crossed}><span>{n}</span><em>{(i === 3 && s >= 1 ? (v + (s >= 3 ? 8 : 3)) : v).toFixed(1)}</em><u data-neg={c.startsWith("-")}>{c}</u></div>)}
      </div>
      <div className="spc-mkt__chart">
        <b className="mono">DLT · 90D COMPARISON</b>
        <svg viewBox="0 0 300 110" preserveAspectRatio="none">
          <path d="M0,70 L40,66 L80,72 L120,60 L160,64 L200,52 L240,56 L300,48" className="spc-hist" />
          <line x1="0" x2="300" y1="30" y2="30" className="spc-th" data-on={s >= 2} />
          <path d={pathFor(s >= 2 ? 6 + s * 2 : 5)} className="spc-live" data-hot={crossed} />
        </svg>
        <span className="mono spc-mkt__tl" data-on={s >= 2}>THRESHOLD 70</span>
      </div>
      <div className="spc-mkt__side">
        <div className="spc-rule"><b className="mono">RULE</b><p>Value above 70 for 3 periods</p><i data-on={crossed}>{crossed ? "TRIGGERED" : "WATCHING"}</i></div>
        <div className="spc-alert" data-on={s >= 4}><CircleAlert />Threshold crossed on DLT</div>
        <div className="spc-an" data-on={s >= 5}><b className="mono">ANALYSIS</b><p>Compared with 90 days of history</p><p>Risk state: within limits</p></div>
      </div>
    </div>
  );
}

function Web3({ s }: { s: number }) {
  const planes = [
    ["WALLET", "Connected  0x4f2a…91c", "Account 1, network: testnet"],
    ["REQUEST", "approve(spender, amount)", "Signed by the user"],
    ["NETWORK", s >= 3 ? "Confirmed  block 18,442,901" : "Pending  waiting for block", "12 confirmations"],
    ["INDEXER", "Transfer event indexed", "Stored with block and hash"],
    ["APPLICATION", "History and balance updated", "User sees the new state"],
  ] as const;
  return (
    <div className="spc-w3">
      {planes.map(([t, a, b], i) => {
        const st = s > i ? "done" : s === i ? "run" : "idle";
        return <div key={t} className="spc-plane" data-st={st} style={{ ["--k" as string]: i }}><span className="mono">{t}</span><b>{a}</b><em>{b}</em><i>{st === "done" ? <Check /> : st === "run" ? <u /> : null}</i></div>;
      })}
    </div>
  );
}

function Dev({ s }: { s: number }) {
  const files = ["src/", "  app/", "  lib/", "package.json", "Dockerfile"];
  return (
    <div className="spc-dev">
      <div className="spc-dev__tree"><b className="mono"><FolderTree />REPOSITORY</b>{files.map((f, i) => <span key={f} data-hot={i === 3 && s >= 2}><FileCode2 />{f}</span>)}</div>
      <div className="spc-dev__code">
        <b className="mono"><GitBranch />package.json</b>
        <pre>
          <i>{'  "dependencies": {'}</i>{"\n"}
          <i data-d={s >= 3 ? "del" : "bad"}>{'    "heavy-lib": "^4.2.0",'}</i>{"\n"}
          <i data-d={s >= 3 ? "add" : "none"}>{s >= 3 ? '    "light-lib": "^1.1.0",' : ""}</i>{"\n"}
          <i>{'    "framework": "^16.0.0"'}</i>{"\n"}
          <i>{"  }"}</i>
        </pre>
        <div className="spc-dev__log mono"><span data-on={s >= 1}>$ analyze --repo</span><span data-on={s >= 4}>tests: 128 passed</span></div>
      </div>
      <div className="spc-dev__rep">
        <b className="mono">REPORT</b>
        <div className="spc-scan"><i style={{ width: s >= 1 ? "100%" : "8%" }} /></div>
        <p data-bad={s >= 2 && s < 3}>{s >= 2 && s < 3 ? <CircleAlert /> : <Check />}{s >= 3 ? "3 findings fixed" : s >= 2 ? "3 findings: oversized dependency" : "Scanning dependencies"}</p>
        <p data-ok={s >= 4}><ShieldCheck />Tests {s >= 4 ? "passing" : "pending"}</p>
        <p data-ok={s >= 5}><Rocket />Preview {s >= 5 ? "LIVE" : "queued"}</p>
      </div>
    </div>
  );
}

export function Specialized() {
  const { reduced } = useMotionPreference();
  const [m, setM] = useState(0);
  const [rep, setRep] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, "-20% 0px -20% 0px");
  const near = useInView(stage, "900px 0px 900px 0px", true);
  const mode = MODES[m];
  const step = useScript(mode.steps, 900, inView, reduced, `${mode.id}-${rep}`);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (m + 1) % MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (m - 1 + MODES.length) % MODES.length;
    if (i >= 0) { e.preventDefault(); setM(i); track("scene_replay", { scene: "specialized", mode: MODES[i].id }); tabs.current[i]?.focus(); }
  };
  return (
    <section id="specialized" className="section spc" aria-labelledby="spc-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.specialized.eyebrow}</p>
          <h2 id="spc-title" className="h2">{copy.specialized.title}</h2>
          <p className="body-l">{copy.specialized.support}</p>
        </Reveal>
        <div className="spc__tabs" role="tablist" aria-label="Specialized software" onKeyDown={onKey}>
          {MODES.map((x, i) => (
            <button key={x.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`spc-${x.id}`} aria-selected={m === i} aria-controls="spc-panel" tabIndex={m === i ? 0 : -1} className="itab" data-active={m === i} onClick={() => { setM(i); track("scene_replay", { scene: "specialized", mode: x.id }); }}><x.icon aria-hidden />{x.tab}</button>
          ))}
        </div>
        <div id="spc-panel" role="tabpanel" aria-labelledby={`spc-${mode.id}`}>
          <div className="spc__stage" ref={stage} data-mode={mode.id} role="img" aria-label={mode.line}>
            {near && <div className="spc__scene" key={mode.id + rep} aria-hidden>
              {mode.id === "market" && <Market s={step} />}
              {mode.id === "web3" && <Web3 s={step} />}
              {mode.id === "dev" && <Dev s={step} />}
            </div>}
          </div>
          <div className="spc__foot">
            <p className="body-l" aria-live="polite">{mode.line}</p>
            <div className="spc__ctas">
              <button type="button" className="btn btn--ghost" onClick={() => setRep((r) => r + 1)}>Replay</button>
              <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "specialized", mode: mode.id }); goToBuilder(e, "Custom Software"); }}>{copy.specialized.cta}<ArrowRight className="arrow" aria-hidden /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
