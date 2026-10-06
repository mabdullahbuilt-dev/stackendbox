import { BookOpen, Check, Package, ShieldCheck, Sparkles } from "lucide-react";

export const SUPPORTGRID_STEPS = 6;

/** An AI support desk as a conversation: the assistant pulls context into the side, drafts, and a person approves. */
export function SupportGrid({ step }: { step: number }) {
  return (
    <div className="bw bw-desk">
      <header className="bw-top"><b><i className="bw-dot" />SupportGrid</b><span>Conversation 5521 · Priya R.</span><em data-ok={step >= 6}>{step >= 6 ? "RESOLVED" : "OPEN"}</em></header>
      <div className="bw-desk__grid">
        <div className="bw-thread">
          <div className="bw-say"><u>PR</u><p>I was charged twice for order 5521. Can I get one of them refunded?</p></div>
          <div className="bw-draft" data-on={step >= 3}>
            <b className="mono"><Sparkles aria-hidden />AI DRAFT</b>
            <p>{step >= 3 ? "You were charged twice on 3 May. I have refunded the duplicate charge of $64. It will reach your card in 3 to 5 days." : ""}<i className="bw-caret" data-on={step === 3} /></p>
            <div className="bw-approve" data-on={step >= 4}><span>{step >= 5 ? <><Check aria-hidden />Sent by Dana after review</> : "Needs review: refund over $50"}</span>{step < 5 && <em>Approve and send</em>}</div>
          </div>
          {step >= 6 && <div className="bw-say bw-say--sys"><p>Priya: Thank you, that was quick.</p></div>}
        </div>
        <div className="bw-ctx">
          <div data-on={step >= 1}><BookOpen aria-hidden /><b>Refund policy</b><span>Duplicate charges: full refund</span></div>
          <div data-on={step >= 2}><Package aria-hidden /><b>Order 5521</b><span>2 captures, $64 each</span></div>
          <div data-on={step >= 2}><ShieldCheck aria-hidden /><b>Confidence 0.92</b><span><i style={{ width: step >= 2 ? "92%" : "0%" }} /></span></div>
        </div>
      </div>
    </div>
  );
}
