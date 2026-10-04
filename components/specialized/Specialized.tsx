"use client";
import { ArrowRight, Boxes, Check, CircleAlert, FileCode2, Folder, GitBranch, Rocket, ShieldCheck, Terminal, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useChapterState } from "@/lib/chapters";
import { useInView } from "@/lib/hooks";
import { goToBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { useScript } from "@/lib/useScript";
import { Reveal } from "@/components/ui/Reveal";

const MODES = [
  { id: "market", tab: "Market and trading", icon: Terminal, steps: 8, line: "Market data, rules, risk gates and alerts in one dense application. Strategy infrastructure runs behind it." },
  { id: "web3", tab: "Web3 and blockchain", icon: Wallet, steps: 9, line: "Wallet, transaction request, network confirmation and indexed state, engineered as one reliable product." },
  { id: "dev", tab: "Developer tools", icon: Boxes, steps: 8, line: "Repository analysis, dependency findings, a proposed fix, tests and a preview, in one technical workspace." },
] as const;

/* ---------- MARKET AND TRADING: STREAM, TRIGGER, ANALYZE ---------- */
const SERIES = [38, 40, 39, 43, 46, 45, 50, 53, 52, 58, 61, 57, 55, 60, 64, 67, 71, 74, 72, 76];
const WATCH: [string, number, number][] = [["ALP", 71.2, 1.4], ["BRV", 48.9, -0.6], ["CRN", 52.4, 0.2], ["DLT", 66.4, 2.1], ["EPS", 33.8, -1.1], ["FRX", 58.0, 0.4], ["GMA", 24.6, 0.9], ["HLX", 91.3, -0.3]];

function Market({ s }: { s: number }) {
  const [hx, setHx] = useState<number | null>(null);
  const upto = Math.min(SERIES.length, 12 + s);
  const pts = SERIES.slice(0, upto);
  const W = 100, Hh = 60;
  const x = (i: number) => (i / (SERIES.length - 1)) * W;
  const y = (v: number) => Hh - (v - 30) * 0.7;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const area = `${d} L${x(pts.length - 1).toFixed(2)},${Hh} L0,${Hh} Z`;
  const triggered = s >= 4;
  const hv = hx !== null ? pts[Math.min(pts.length - 1, Math.max(0, Math.round(hx * (SERIES.length - 1))))] : null;
  const node = (i: number, label: string, sub: string, st: "idle" | "run" | "ok") => (
    <div key={label} className="mk-node" data-st={st}><b>{label}</b><span>{sub}</span><i>{st === "ok" ? "OK" : st === "run" ? "RUN" : "IDLE"}</i></div>
  );
  return (
    <div className="mk">
      <div className="mk__watch">
        <b className="mono">WATCHLIST</b>
        {WATCH.map(([sym, p, c], i) => {
          const live = i === 3 ? p + Math.min(s, 6) * 0.9 : p + (s > 0 ? (i % 2 ? 0.2 : -0.1) * Math.min(s, 3) : 0);
          return <div key={sym} data-hot={i === 3 && triggered} data-flash={s === 0 || s === 1}><span>{sym}</span><em>{live.toFixed(1)}</em><u data-neg={c < 0}>{c > 0 ? "+" : ""}{c.toFixed(1)}</u></div>;
        })}
        <div className="mk__feed"><b className="mono">FEED HEALTH</b><span><i style={{ width: "92%" }} />4 sources · 42ms</span></div>
      </div>
      <div className="mk__chart" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHx(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }} onPointerLeave={() => setHx(null)}>
        <div className="mk__chead"><b className="mono">DLT · 15M</b><span className="mono">{hv !== null ? `${(hv * 1.05).toFixed(1)}` : `${(pts[pts.length - 1] * 1.05).toFixed(1)}`}</span></div>
        <svg viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none" aria-hidden>
          {[15, 30, 45].map((g) => <line key={g} x1="0" x2={W} y1={g} y2={g} className="mk__grid" />)}
          <path d="M0,34 L10,32 L20,36 L30,28 L40,30 L50,22 L60,24 L70,20 L80,22 L90,16 L100,14" className="mk__hist" />
          <path d={area} className="mk__area" data-hot={triggered} />
          <path d={d} className="mk__line" data-hot={triggered} />
          <line x1="0" x2={W} y1="14" y2="14" className="mk__th" data-on={s >= 3} />
          {hx !== null && <line x1={hx * W} x2={hx * W} y1="0" y2={Hh} className="mk__cross" />}
        </svg>
        <span className="mk__thl mono" data-on={s >= 3}>THRESHOLD 70</span>
        <div className="mk__alert" data-on={s >= 6}><CircleAlert aria-hidden /><div><b>Rule 12 fired</b><span>DLT above threshold for 3 periods</span></div></div>
      </div>
      <div className="mk__side">
        <div className="mk__card" data-on={s >= 3}><b className="mono">RULE 12</b><p>Value above 70 for 3 periods</p><i data-hot={triggered}>{triggered ? "TRIGGERED" : "WATCHING"}</i></div>
        <div className="mk__card" data-on={s >= 5}><b className="mono">RISK GATE</b><p>Exposure within configured limits</p><s><i style={{ width: s >= 5 ? "38%" : "10%" }} /></s></div>
        <div className="mk__card"><b className="mono">ANALYSIS</b><p>Compared with 90 days of history</p><p className="mk__muted">No performance claims are made here.</p></div>
        <ul className="mk__log mono"><li data-on>feed connected</li><li data-on={s >= 4}>rule 12 triggered</li><li data-on={s >= 5}>risk gate passed</li><li data-on={s >= 7}>alert recorded</li></ul>
      </div>
      <div className="mk__infra">
        {node(0, "Data feed", "4 sources", s >= 1 ? "ok" : "run")}
        <i aria-hidden />
        {node(1, "Signal engine", "rule set v3", s >= 4 ? "ok" : s >= 2 ? "run" : "idle")}
        <i aria-hidden />
        {node(2, "Risk gate", "limits", s >= 5 ? "ok" : s >= 4 ? "run" : "idle")}
        <i aria-hidden />
        {node(3, "Execution gateway", "dry run", s >= 7 ? "ok" : s >= 6 ? "run" : "idle")}
      </div>
    </div>
  );
}

/* ---------- WEB3: CONNECT, SIGN, CONFIRM, INDEX (three depth planes) ---------- */
function Web3({ s }: { s: number }) {
  const status = s >= 6 ? "ok" : s >= 4 ? "run" : "idle";
  const blocks = ["18,442,899", "18,442,900", ...(s >= 5 ? ["18,442,901"] : [])];
  return (
    <div className="w3">
      <div className="w3__back" aria-hidden>
        <div className="w3__net"><b className="mono">NETWORK · TESTNET</b>
          <div className="w3__blocks">{blocks.map((b, i) => <span key={b} data-new={b.endsWith("901")} data-conf={b.endsWith("901") && s >= 6}><em className="mono">#{b}</em><i>{12 + i * 3} tx</i><s>0x{(i + 3) * 1117 % 9999}…c{i}</s></span>)}</div>
        </div>
        <div className="w3__idx"><b className="mono">INDEXER</b>
          <ul><li data-on>Transfer indexed #18,442,899</li><li data-on={s >= 7} data-new>Approval indexed #18,442,901</li></ul>
        </div>
      </div>
      <div className="w3__mid" data-st={status} data-pos={s >= 4 ? "back" : s >= 2 ? "front" : "hidden"} tabIndex={0}>
        <b className="mono">TRANSACTION REQUEST</b>
        <p>approve(spender, 250)</p>
        <div className="w3__fields"><span>To <em className="mono">0x9b1c…e04</em></span><span>Network <em>Testnet</em></span><span>Fee <em>0.0004</em></span></div>
        <span className="w3__status" data-st={status}>{status === "ok" ? "CONFIRMED" : status === "run" ? "PENDING" : "READY"}</span>
        <div className="w3__meta mono" role="note">hash 0x7ae3…91cf · nonce 41 · chain 11155111</div>
      </div>
      <div className="w3__front">
        <div className="w3__app">
          <div className="w3__top"><span className="w3__logo">N</span><b>Northwind Console</b>
            <button type="button" tabIndex={-1} className="w3__wallet" data-on={s >= 1}><Wallet aria-hidden />{s >= 1 ? "0x4f2a…91c" : "Connect wallet"}</button></div>
          <div className="w3__body">
            <div className="w3__bal"><b className="mono">ALLOWANCE</b><strong>{s >= 8 ? "250" : "0"}</strong><span>{s >= 8 ? "updated from chain state" : "waiting"}</span></div>
            <ul className="w3__hist"><li data-on>Deposit confirmed</li><li data-on>Wallet connected</li><li data-on>Network switched to Testnet</li><li data-on={s >= 8} data-new><Check aria-hidden />Approval recorded</li></ul>
          </div>
          <div className="w3__sign" data-on={s === 3}><ShieldCheck aria-hidden />Sign message to approve<button type="button" tabIndex={-1}>Sign</button></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- DEVELOPER TOOLS: SCAN, INSPECT, FIX, VERIFY ---------- */
const NODES: { id: string; x: number; y: number; label: string }[] = [
  { id: "app", x: 50, y: 12, label: "app" }, { id: "ui", x: 22, y: 36, label: "ui-kit" }, { id: "api", x: 50, y: 40, label: "api" }, { id: "auth", x: 78, y: 36, label: "auth" },
  { id: "heavy", x: 14, y: 70, label: "heavy-lib" }, { id: "db", x: 42, y: 74, label: "db" }, { id: "log", x: 64, y: 72, label: "logger" }, { id: "jwt", x: 88, y: 70, label: "jwt" },
];
const EDGES: [string, string][] = [["app", "ui"], ["app", "api"], ["app", "auth"], ["ui", "heavy"], ["api", "db"], ["api", "log"], ["auth", "jwt"]];

function Dev({ s }: { s: number }) {
  const [hov, setHov] = useState<string | null>(null);
  const fixed = s >= 5;
  const lines = ["$ scan --repo northwind/app", "found 214 dependencies", "heavy-lib: 38 MB, 1 import", "applying proposed change", "running tests", "128 passed", "preview deployed"];
  const nodes = NODES.map((n) => (n.id === "heavy" && fixed ? { ...n, label: "light-lib" } : n));
  return (
    <div className="dv">
      <div className="dv__tree"><b className="mono"><GitBranch aria-hidden />main</b>
        {[["src", 0, true], ["app", 1, true], ["lib", 1, true], ["package.json", 0, false], ["Dockerfile", 0, false], ["tests", 0, true]].map(([n, d, f]) => <span key={n as string} data-hot={n === "package.json" && s >= 1 && s < 6} style={{ paddingLeft: 6 + (d as number) * 14 }}>{f ? <Folder aria-hidden /> : <FileCode2 aria-hidden />}{n as string}</span>)}
      </div>
      <div className="dv__graph" onPointerLeave={() => setHov(null)}>
        <b className="mono">DEPENDENCY GRAPH</b>
        <svg viewBox="0 0 100 86" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {EDGES.map(([a, b]) => { const A = NODES.find((n) => n.id === a)!, B = NODES.find((n) => n.id === b)!; const on = s >= 1 && (hov === a || hov === b); return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} data-on={s >= 1} data-hover={on} />; })}
          {nodes.map((n, i) => {
            const bad = n.id === "heavy" && s >= 3 && !fixed;
            const good = n.id === "heavy" && fixed;
            return (
              <g key={n.id} transform={`translate(${n.x} ${n.y})`} data-on={s >= 1} data-bad={bad} data-good={good} data-hover={hov === n.id} style={{ ["--d" as string]: `${i * 60}ms` }} onPointerEnter={() => setHov(n.id)}>
                <circle r="3.6" /><text y="7.6" textAnchor="middle">{n.label}</text>
              </g>
            );
          })}
        </svg>
        <div className="dv__diff" data-on={s >= 4 && s < 6}><b className="mono">PROPOSED CHANGE</b><code data-d="del">- heavy-lib   ^4.2.0</code><code data-d="add">+ light-lib   ^1.1.0</code></div>
        <p className="dv__rel mono">{hov ? `${hov}: ${EDGES.filter(([a, b]) => a === hov || b === hov).length} links in the graph` : "Hover a package to see what depends on it"}</p>
      </div>
      <div className="dv__log mono">{lines.slice(0, Math.min(lines.length, s + 1)).map((l, i) => <p key={l} data-last={i === Math.min(lines.length, s + 1) - 1}>{l}</p>)}</div>
      <div className="dv__rep">
        <b className="mono">FINDINGS</b>
        <p data-st={s >= 6 ? "ok" : s >= 3 ? "bad" : "idle"}>{s >= 6 ? <Check aria-hidden /> : <CircleAlert aria-hidden />}{s >= 6 ? "Oversized dependency fixed" : s >= 3 ? "1 oversized dependency" : "Scanning dependencies"}</p>
        <p data-st={s >= 7 ? "ok" : "idle"}><ShieldCheck aria-hidden />Tests {s >= 7 ? "128 passed" : s >= 6 ? "running" : "waiting"}</p>
        <p data-st={s >= 8 ? "ok" : "idle"}><Rocket aria-hidden />Preview {s >= 8 ? "LIVE" : "queued"}</p>
        <div className="dv__size"><span>Bundle</span><s><i style={{ width: fixed ? "34%" : "88%" }} /></s><em className="mono">{fixed ? "1.2 MB" : "3.1 MB"}</em></div>
      </div>
    </div>
  );
}

export function Specialized() {
  const { reduced } = useMotionPreference();
  const [m, setM] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const chapter = useChapterState("specialized");
  const inView = useInView(stage, "-15% 0px -15% 0px");
  const mode = MODES[m];
  // one tracked script per mode; switching modes cancels the old one before the new one starts
  const step = useScript(mode.steps, 900, inView && chapter !== "far", reduced, mode.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pick = (i: number) => { setM(i); track("scene_replay", { scene: "specialized", mode: MODES[i].id }); };
  const onKey = (e: React.KeyboardEvent) => {
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (m + 1) % MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (m - 1 + MODES.length) % MODES.length;
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
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
            <button key={x.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`spc-${x.id}`} aria-selected={m === i} aria-controls="spc-panel" tabIndex={m === i ? 0 : -1} className="itab" data-active={m === i} onClick={() => pick(i)}><x.icon aria-hidden />{x.tab}</button>
          ))}
        </div>
        <div id="spc-panel" role="tabpanel" aria-labelledby={`spc-${mode.id}`}>
          <div className="spc__stage" ref={stage} data-mode={mode.id} role="img" aria-label={mode.line}>
            <div className="spc__scene" key={mode.id} aria-hidden>
              {mode.id === "market" && <Market s={step} />}
              {mode.id === "web3" && <Web3 s={step} />}
              {mode.id === "dev" && <Dev s={step} />}
            </div>
          </div>
          <div className="spc__foot">
            <p className="body-l" aria-live="polite">{mode.line}</p>
            <Link href="/#start" className="btn btn--primary" onClick={(e) => { track("cta_click", { placement: "specialized", mode: mode.id }); goToBuilder(e, mode.id === "web3" ? "Web3 / Blockchain" : mode.id === "market" ? "Trading / Data Platform" : "Custom Software", undefined, "specialized"); }}>{copy.specialized.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
