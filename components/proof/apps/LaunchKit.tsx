import { Check, CircleDot, CreditCard, Globe, KeyRound, Rocket, ShieldCheck, Users } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";

export const LAUNCHKIT_STEPS = 5;
const CHECKS = [[KeyRound, "Sign up and auth", 1], [CreditCard, "Billing and plans", 2], [Users, "Roles and invites", 3], [Globe, "Domain and SSL", 4], [ShieldCheck, "Monitoring", 5]] as const;
const PIPE = ["Build", "Tests", "Preview", "Production"] as const;

/** Release readiness for a SaaS launch: a checklist ring, a deploy pipeline and the release log. No table, no sidebar. */
export function LaunchKit({ step }: { step: number }) {
  const done = CHECKS.filter(([, , at]) => step >= at).length;
  const pct = done / CHECKS.length;
  const C = 2 * Math.PI * 40;
  return (
    <div className="bw bw-launch">
      <header className="bw-top"><b><i className="bw-dot" />LaunchKit</b><span>Release 1.4 to production</span><em data-ok={step >= 5}>{step >= 5 ? "LIVE" : "READYING"}</em></header>
      <div className="bw-launch__grid">
        <div className="bw-ring">
          <svg viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="40" className="bw-ring__bg" /><circle cx="50" cy="50" r="40" className="bw-ring__fg" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct) }} /></svg>
          <strong>{Math.round(pct * 100)}%</strong><span className="mono">LAUNCH READY</span>
        </div>
        <ul className="bw-checks">{CHECKS.map(([Ic, t, at]) => <li key={t} data-st={step >= at ? "ok" : step + 1 === at ? "run" : "idle"}><Ic aria-hidden />{t}<span>{step >= at ? <Check aria-label="done" /> : <CircleDot aria-hidden />}</span></li>)}</ul>
      </div>
      <div className="bw-pipe">{PIPE.map((p, i) => <span key={p} data-st={step >= i + 2 ? "ok" : step === i + 1 ? "run" : "idle"}>{p}{i < PIPE.length - 1 && <i />}</span>)}</div>
      <ol className="bw-log mono">
        <li data-on={step >= 1}>auth: email and Google sign in enabled</li>
        <li data-on={step >= 2}><BrandIcon name="stripe" size={11} /> stripe: Pro plan and webhooks verified</li>
        <li data-on={step >= 3}>roles: owner, admin, member seeded</li>
        <li data-on={step >= 5}><Rocket aria-hidden /> production: release 1.4 live</li>
      </ol>
    </div>
  );
}
