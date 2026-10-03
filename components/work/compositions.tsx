import { Check, CircleDollarSign, Code2, FileText, Music2, Play } from "lucide-react";

/**
 * Product UI compositions rebuilt from each project's real interface (names and on-screen wording only).
 * Shown only when no real screenshot exists in /public/work. A real image always takes priority.
 */
export function ProjectComposition({ slug }: { slug: string }) {
  switch (slug) {
    case "resolve":
      return (
        <div className="pc pc-resolve" aria-hidden>
          <div className="pc-top"><span className="mono">EXAMPLE WORKFLOW · VALUE ROUTING ENGINE</span><span className="pc-ok"><Check />Verified path</span></div>
          <div className="pc-rcols">
            <div className="pc-src"><span className="mono">SOURCE ACTIVITY</span>
              {[[Code2, "GitHub contribution", "Commit evidence"], [FileText, "Research citation", "Source reference"], [Music2, "Music play", "Artist attribution"], [Play, "Video watch", "Completion signal"]].map(([I, t, s]) => {
                const Icon = I as typeof Code2;
                return <div key={t as string} className="pc-item"><Icon /><span><b>{t as string}</b><em>{s as string}</em></span><Check className="pc-tick" /></div>;
              })}
            </div>
            <div className="pc-core"><i /><i /><i /><b>R</b><span className="mono">RESOLVE EVIDENCE CORE</span></div>
            <div className="pc-right">
              <div className="pc-card"><span className="mono">FUNDING BLUEPRINT</span>{["Payees identified", "Policy prepared", "Evidence attached"].map((t) => <p key={t}><Check />{t}</p>)}<u><i /></u></div>
              <div className="pc-card pc-card--g"><span className="mono">ARC SETTLEMENT</span><b>USDC authorization</b><em>Receipt produced after approval</em><span className="pc-badge">Preview, not submitted</span></div>
            </div>
          </div>
        </div>
      );
    case "meridian":
      return (
        <div className="pc pc-meridian" aria-hidden>
          <div className="pc-nav"><b>M</b><span>Home</span><span>Strategy</span><span>NEXUS</span><span>PRISM</span><u>Connect wallet</u></div>
          <div className="pc-mcols">
            <div className="pc-orbit">{["BTC", "USDC", "ETH", "SOL"].map((c, i) => <span key={c} style={{ ["--a" as string]: i }}>{c}</span>)}<b>AI CORE</b></div>
            <div className="pc-mtext"><span className="mono">MERIDIAN</span><h4>Turn market data into backtestable strategy.</h4><p>Live market data, explainable rules and permit gated execution in one desk.</p><ul><li>Eight skills score live market data</li><li>Permit gates every trade before settlement</li><li>Historical replay uses the same rules as the live desk</li></ul></div>
          </div>
        </div>
      );
    case "repodiet":
      return (
        <div className="pc pc-repo" aria-hidden>
          <div className="pc-top"><span className="mono">REPODIET DELIVERY ENGINE</span><span className="mono">BUYER CONTROLLED</span></div>
          <div className="pc-steps">{["ANALYZE", "APPROVE", "EXECUTE", "VERIFY", "DELIVER"].map((s, i) => <span key={s} data-on={i < 4} data-cur={i === 3}>{s}</span>)}</div>
          <div className="pc-rcols pc-rcols--2">
            <div className="pc-tree"><span className="mono">REPOSITORY INTELLIGENCE</span>{[["src/", ""], ["components/", "UNUSED"], ["legacy/", "DUPLICATE"], ["package.json", "DEPENDENCY"], ["tests/", ""], ["auth/", "PROTECTED"]].map(([f, b]) => <div key={f}><code>{f}</code>{b && <u data-p={b === "PROTECTED"}>{b}</u>}</div>)}</div>
            <div className="pc-card pc-card--g"><span className="mono">REVIEW PULL REQUEST</span><b>Cleanup pull request</b>{["Approved scope applied", "Protected paths unchanged", "Repository checks completed"].map((t) => <p key={t}><Check />{t}</p>)}</div>
          </div>
        </div>
      );
    case "agora-forge":
      return (
        <div className="pc pc-agora" aria-hidden>
          <div className="pc-top"><span className="mono">EXECUTION DESK</span><span className="mono">MULTICHAIN LIVE QUOTES</span></div>
          <div className="pc-route">
            {[["USDC", "ARC", "1,000.00"], ["USDC", "BASE", "999.80"], ["ETH", "ETHEREUM", "0.412"]].map(([t, n, v], i) => (
              <div key={t + n} className="pc-tok"><CircleDollarSign /><b>{t}</b><em>{n}</em><span className="mono">{v}</span>{i < 2 && <span className="pc-via mono">{i === 0 ? "CIRCLE CCTP" : "LI.FI"}</span>}</div>
            ))}
          </div>
          <div className="pc-stats">{[["ROUTES FOUND", "12 live"], ["EST. SETTLEMENT", "2.1s"], ["MAX SLIPPAGE", "0.02%"]].map(([k, v]) => <div key={k}><span className="mono">{k}</span><b>{v}</b></div>)}</div>
        </div>
      );
    default:
      return (
        <div className="pc pc-xroga" aria-hidden>
          <span className="mono">FREE AI APP BUILDER</span>
          <h4>Start a Web3 project before you pay.</h4>
          <p>Turn a Web3 or blockchain idea into a working project and build against a real repository.</p>
          <ul>{["No card required", "Repository aware edits", "Preview and verification"].map((t) => <li key={t}><Check />{t}</li>)}</ul>
          <u>Start Free</u>
          <div className="pc-folder"><i /><i /><b /></div>
        </div>
      );
  }
}
