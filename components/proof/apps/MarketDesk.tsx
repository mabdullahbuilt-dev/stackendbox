import { Bell, CandlestickChart, Gauge, ListTree, SlidersHorizontal } from "lucide-react";
import { AppShell, Chip } from "./Shell";

export const MARKETDESK_STEPS = 6;
const ROWS = [["EUR/USD", 1.0842, "ok"], ["XAU/USD", 2318.4, "idle"], ["US500", 5304.2, "idle"], ["GBP/JPY", 192.18, "idle"]] as const;

export function MarketDesk({ step }: { step: number }) {
  const tick = step >= 1;
  const price = (v: number, i: number) => (tick ? v + (i === 1 ? 14.6 : (i + 1) * 0.0004 * v * 0.1) : v);
  const risk = step >= 4 ? ["bad", "Elevated"] : ["ok", "Normal"];
  return (
    <AppShell
      name="MarketDesk" active={0} title="Watchlist"
      nav={[[ListTree, "Watchlist"], [CandlestickChart, "Charts"], [Bell, "Alerts"], [SlidersHorizontal, "Rules"], [Gauge, "Risk"]]}
      top={<><Chip tone="ok">Data live</Chip><Chip tone={risk[0] as "ok" | "bad"}>Risk: {risk[1]}</Chip></>}
      rail={
        <>
          <div className="pa-card"><b className="mono">RULE</b><p className="pa-rule">XAU/USD crosses above 2,330</p>{step >= 2 ? <Chip tone={step >= 3 ? "ok" : "run"}>{step >= 3 ? "Triggered" : "Checking"}</Chip> : <Chip tone="idle">Armed</Chip>}</div>
          <div className="pa-card"><b className="mono">ACTIVITY</b>
            <ol className="pa-log">
              {step >= 5 && <li data-cur>Chart marker added</li>}
              {step >= 4 && <li>Alert sent to desk</li>}
              {step >= 3 && <li>Rule triggered: XAU/USD</li>}
              <li>Feed connected</li>
            </ol>
          </div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Instrument</span><span>Price</span><span>State</span></div>
        {ROWS.map(([n, v], i) => (
          <div key={n} className="pa-tr pa-tr3" data-cur={i === 1 && step >= 3}>
            <span>{n}</span><span className="tnum mono">{price(v, i).toFixed(n === "US500" || n === "XAU/USD" ? 1 : 4)}</span>
            <span>{i === 1 && step >= 3 ? <Chip tone="run">Alert</Chip> : <Chip tone="ok">Normal</Chip>}</span>
          </div>
        ))}
      </div>
      <div className="pa-chart" aria-hidden>
        <svg viewBox="0 0 300 70" preserveAspectRatio="none"><polyline points="0,52 30,46 60,50 90,38 120,42 150,30 180,34 210,22 240,26 270,18 300,14" />{step >= 5 && <circle cx="270" cy="18" r="5" />}</svg>
      </div>
    </AppShell>
  );
}
