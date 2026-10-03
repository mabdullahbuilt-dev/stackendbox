import { Blocks, FileCode2, Landmark, ListChecks, Wallet } from "lucide-react";
import { AppShell, Chip } from "./Shell";

export const CHAINDESK_STEPS = 6;

export function ChainDesk({ step }: { step: number }) {
  const tx = step >= 4 ? "ok" : step >= 2 ? "run" : "idle";
  return (
    <AppShell
      name="ChainDesk" active={2} title="Transactions"
      nav={[[Landmark, "Overview"], [Wallet, "Wallets"], [ListChecks, "Transactions"], [FileCode2, "Contracts"], [Blocks, "Admin"]]}
      top={<><Chip tone={step >= 1 ? "ok" : "idle"}>{step >= 1 ? "Wallet connected" : "No wallet"}</Chip><Chip tone="idle">Testnet</Chip></>}
      rail={
        <>
          <div className="pa-card"><b className="mono">ACCOUNT</b>
            <div className="pa-wallet"><span className="pa-addr mono">{step >= 1 ? "0x7a3F...c91E" : "Not connected"}</span><span>Access pass</span>{step >= 5 ? <Chip tone="ok">Active</Chip> : <Chip tone="idle">None</Chip>}</div>
          </div>
          <div className="pa-card"><b className="mono">INDEXED EVENTS</b>
            <ul className="pa-ev">
              {step >= 5 && <li data-cur><b className="mono">AccessGranted</b><span>block 18,204,411</span></li>}
              <li><b className="mono">Transfer</b><span>block 18,204,387</span></li>
              <li><b className="mono">RoleSet</b><span>block 18,204,102</span></li>
            </ul>
          </div>
        </>
      }
    >
      <div className="pa-table">
        <div className="pa-th"><span>Action</span><span>Contract</span><span>Status</span></div>
        {tx !== "idle" && <div className="pa-tr pa-tr3 pa-tr--new" data-cur><span>Mint access pass</span><span className="mono">Membership</span><span><Chip tone={tx === "ok" ? "ok" : "run"}>{tx === "ok" ? "Confirmed" : "Pending"}</Chip></span></div>}
        {[["Grant role", "Registry"], ["Transfer", "Membership"], ["Update metadata", "Registry"]].map(([a, c]) => <div key={a} className="pa-tr pa-tr3"><span>{a}</span><span className="mono">{c}</span><span><Chip tone="ok">Confirmed</Chip></span></div>)}
      </div>
      <div className="pa-foot"><span className="pa-note"><Blocks aria-hidden />{step >= 6 ? "Application state updated from the indexed event" : step >= 5 ? "Event indexed" : "Waiting for confirmation"}</span></div>
    </AppShell>
  );
}
