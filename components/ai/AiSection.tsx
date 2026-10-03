"use client";
import { ArrowRight, Bot, Check, Database, FileSearch, MessageSquare, Zap, UserCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { useSteps } from "@/lib/useSteps";
import { Reveal } from "@/components/ui/Reveal";

const trace: [LucideIcon, string, string][] = [
  [MessageSquare, "Request", "A customer asks for a refund on order 5521"],
  [FileSearch, "Context", "Order, policy and past tickets retrieved"],
  [Bot, "Model", "Decides the next step from the policy"],
  [Zap, "Tool call", "check_refund_eligibility(order_5521)"],
  [Database, "Data", "Payment record and delivery status read"],
  [UserCheck, "Approval", "Refund over the limit waits for a person"],
  [Check, "Action", "Refund issued and customer notified"],
];

export function AiSection() {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "-10% 0px -10% 0px");
  const s = useSteps([0, 900, 1800, 2700, 3600, 4500, 5800], inView && !reduced, reduced, 3200);
  return (
    <section id="ai" className="section section--alt aisec" aria-labelledby="ai-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.ai.eyebrow}</p>
          <h2 id="ai-title" className="h2">{copy.ai.title}</h2>
          <p className="body-l">{copy.ai.support}</p>
        </Reveal>
        <div className="aisec__grid" ref={ref}>
          <div className="aiwin" aria-hidden>
            <div className="aiwin__bar"><i /><i /><i /><span>Support agent</span><b className="mono" data-done={s >= 6}>{s >= 6 ? "COMPLETE" : "RUNNING"}</b></div>
            <div className="aiwin__chat">
              <div className="aib aib--u" data-on={s >= 0}>I was charged twice for order 5521. Can I get a refund?</div>
              <div className="aib" data-on={s >= 2}>I checked your order and the refund policy. Refunding the duplicate charge needs a quick approval.</div>
              <div className="aiapp" data-on={s >= 5} data-ok={s >= 6}>
                <span className="mono">APPROVAL NEEDED</span>
                <b>Refund 1 duplicate charge</b>
                <div><span className="mk-btn mk-btn--ok">{s >= 6 ? "Approved" : "Approve"}</span><span className="mk-btn">Edit</span></div>
              </div>
              <div className="aib aib--g" data-on={s >= 6}>Done. The duplicate charge is refunded and you will get an email shortly.</div>
            </div>
          </div>
          <ol className="aitrace" aria-hidden>
            {trace.map(([I, t, d], i) => (
              <li key={t} data-state={s > i ? "done" : s === i ? "active" : "idle"}>
                <span className="aitrace__ic"><I /></span>
                <b>{t}</b><em>{d}</em>
              </li>
            ))}
          </ol>
        </div>
        <p className="sr-only">An AI agent receives a refund request, retrieves the order and policy, calls a tool to check eligibility, reads payment data, waits for human approval and then issues the refund.</p>
        <div className="aisec__foot">
          <ul className="aiverbs" aria-label="What AI can do inside a workflow">{copy.ai.verbs.map((v) => <li key={v}>{v}</li>)}</ul>
          <Link href="/#start" className="btn btn--primary" onClick={() => { track("ai_cta", { placement: "ai" }); presetBuilder("AI System"); }}>{copy.ai.cta}<ArrowRight className="arrow" aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}
