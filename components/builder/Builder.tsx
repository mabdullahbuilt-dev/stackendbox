"use client";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { siteConfig } from "@/site.config";
import { track } from "@/lib/analytics";
import { GOALS, NEEDS, STAGES, TIMELINES } from "@/lib/briefOptions";
import { briefLines, buildBrief } from "@/lib/briefTemplate";
import { intentNeed, readIntent } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { BuilderStage } from "./BuilderStage";

type Phase = "q" | "brief" | "contact" | "done";
const QUESTIONS = [
  { title: "What do you need?", helper: "Choose up to three.", multi: true },
  { title: "Where are you now?", helper: "Pick the closest match.", multi: false },
  { title: "What matters most?", helper: "Pick the one that matters most right now.", multi: false },
] as const;

function Choice({ type, name, label, checked, disabled, onChange }: {
  type: "radio" | "checkbox"; name: string; label: string; checked: boolean; disabled?: boolean; onChange: () => void;
}) {
  return (
    <label className="choice" data-checked={checked} data-disabled={disabled}>
      <input type={type} name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span>{label}</span>
      <Check aria-hidden className="choice__check" />
    </label>
  );
}

function Field({ id, label, error, textarea, optional, ...p }: {
  id: string; label: string; error?: string; textarea?: boolean; optional?: boolean; rows?: number;
} & React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement>) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div className="field" data-invalid={!!error}>
      <Tag id={id} placeholder=" " aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...(p as object)} />
      <label htmlFor={id}>{label}{optional && <em> (optional)</em>}</label>
      {error && <p id={`${id}-err`} className="field__err">{error}</p>}
    </div>
  );
}

export function Builder() {
  const uid = useId();
  const { reduced } = useMotionPreference();
  const [phase, setPhase] = useState<Phase>("q");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [needs, setNeeds] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [goal, setGoal] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", company: "", context: "", url: "", timeline: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [serverErr, setServerErr] = useState("");
  const started = useRef(false);
  const prefilled = useRef(false);
  const focusRef = useRef<HTMLElement>(null);
  const mounted = useRef(false);

  const startedTrack = useCallback(() => {
    if (!started.current) {
      started.current = true;
      track("builder_started", { prefilled: prefilled.current });
    }
  }, []);

  // Personalisation (P2): preselect from remembered intent. User can deselect.
  useEffect(() => {
    const i = readIntent();
    if (i) {
      prefilled.current = true;
      setNeeds((n) => (n.length ? n : [intentNeed[i]]));
    }
    const on = (e: Event) => {
      const need = (e as CustomEvent<string>).detail;
      prefilled.current = true;
      setPhase("q");
      setStep(0);
      setNeeds((n) => (n.includes(need) ? n : [...n, need].slice(-3)));
    };
    window.addEventListener("seb:builder-preset", on);
    return () => window.removeEventListener("seb:builder-preset", on);
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(() => focusRef.current?.focus({ preventScroll: false }), reduced ? 0 : 280);
    return () => clearTimeout(t);
  }, [phase, step, reduced]);

  const brief = useMemo(() => buildBrief(needs, stage, goal), [needs, stage, goal]);
  const lines = briefLines(brief);

  const toggleNeed = (n: string) => {
    startedTrack();
    setErr("");
    setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : cur.length >= 3 ? cur : [...cur, n]));
  };

  const next = () => {
    const ok = step === 0 ? needs.length > 0 : step === 1 ? !!stage : !!goal;
    if (!ok) {
      setErr(step === 0 ? "Choose at least one to continue." : "Pick one to continue.");
      return;
    }
    setErr("");
    track("builder_step_completed", { step: step + 1, selection: step === 0 ? needs.join("|") : step === 1 ? stage : goal });
    setDir(1);
    if (step < 2) setStep(step + 1);
    else {
      setPhase("brief");
    }
  };
  const back = () => {
    setErr("");
    setDir(-1);
    if (phase === "contact") setPhase("brief");
    else if (phase === "brief") setPhase("q");
    else if (step > 0) setStep(step - 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { needs, stage, goal, ...form, timeline: form.timeline || undefined };
    // Validation library is loaded on demand so it never weighs on the initial page load.
    const { briefSchema } = await import("@/lib/briefSchema");
    const r = briefSchema.safeParse(payload);
    if (!r.success) {
      const f: Record<string, string> = {};
      for (const i of r.error.issues) f[String(i.path[0])] ??= i.message;
      setErrors(f);
      track("builder_error", { field: Object.keys(f)[0] });
      (document.getElementById(`${uid}-${Object.keys(f)[0]}`) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setStatus("sending");
    setServerErr("");
    track("builder_submitted", { needs: needs.join("|"), stage, goal });
    try {
      const res = await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r.data) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (res.ok && body.ok) {
        track("contact_submit_success");
        setStatus("idle");
        setPhase("done");
        setDir(1);
        return;
      }
      if (body.fields) setErrors(body.fields);
      setServerErr(
        body.error === "rate_limited"
          ? "Too many attempts. Please wait a few minutes and try again."
          : body.error === "validation"
            ? "Please check the highlighted fields."
            : "We couldn't send this right now. Please try again shortly.",
      );
      track("builder_error", { field: body.error ?? "unknown" });
    } catch {
      setServerErr("We couldn't send this right now. Check your connection and try again.");
      track("builder_error", { field: "network" });
    }
    setStatus("error");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const slide = reduced ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const };
  const q = QUESTIONS[step];
  const title = phase === "q" ? q.title : phase === "brief" ? "Your starting brief" : phase === "contact" ? "Where should we reply?" : "Brief received.";

  return (
    <section id="start" className="section section--alt builder" aria-labelledby="start-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.builder.eyebrow}</p>
          <h2 id="start-title" className="h2">{copy.builder.title}</h2>
          <p className="body-l">{copy.builder.support}</p>
        </Reveal>

        <div className="builder__grid">
          <div className="builder__left">
            {phase === "q" && (
              <div className="builder__progress" role="img" aria-label={`Step ${step + 1} of 3`}>
                {[0, 1, 2].map((i) => (
                  <i key={i} data-on={i <= step} />
                ))}
                <span className="mono mono--muted">{step + 1} / 3 · {copy.builder.time}</span>
              </div>
            )}

            <div className="builder__card">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <m.div
                  key={phase === "q" ? `q${step}` : phase}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -28 }}
                  transition={slide}
                >
                  {phase === "q" && (
                    <fieldset className="builder__fs">
                      <legend ref={focusRef as React.RefObject<HTMLLegendElement>} tabIndex={-1} className="builder__q">{q.title}</legend>
                      <p className="builder__helper">{q.helper}</p>
                      <div className="choices" role={q.multi ? "group" : "radiogroup"}>
                        {step === 0 && NEEDS.map((n) => (
                          <Choice key={n} type="checkbox" name="need" label={n} checked={needs.includes(n)} disabled={!needs.includes(n) && needs.length >= 3} onChange={() => toggleNeed(n)} />
                        ))}
                        {step === 1 && STAGES.map((s) => (
                          <Choice key={s} type="radio" name="stage" label={s} checked={stage === s} onChange={() => { setStage(s); setErr(""); }} />
                        ))}
                        {step === 2 && GOALS.map((g) => (
                          <Choice key={g} type="radio" name="goal" label={g} checked={goal === g} onChange={() => { setGoal(g); setErr(""); }} />
                        ))}
                      </div>
                      {err && <p role="alert" className="field__err">{err}</p>}
                    </fieldset>
                  )}

                  {phase === "brief" && (
                    <div className="brief">
                      <h3 ref={focusRef as React.RefObject<HTMLHeadingElement>} tabIndex={-1} className="mono brief__eyebrow">YOUR STARTING BRIEF</h3>
                      <dl className="brief__facts">
                        <div><dt className="mono mono--muted">NEED</dt><dd>{brief.needs.join(" · ")}</dd></div>
                        <div><dt className="mono mono--muted">STAGE</dt><dd>{brief.stage}</dd></div>
                        <div><dt className="mono mono--muted">GOAL</dt><dd>{brief.goal}</dd></div>
                      </dl>
                      <p className="brief__line">{lines.line2}</p>
                      <p className="body-s mono--muted">We review every brief and reply with questions, not a pitch.</p>
                      <div className="brief__actions">
                        <Button size="lg" onClick={() => { setDir(1); setPhase("contact"); }}>Discuss This Project</Button>
                        {siteConfig.schedulingUrl && (
                          <a className="btn btn--lg btn--secondary" href={siteConfig.schedulingUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("contact_clicked", { placement: "builder-call" })}>
                            Book a Call
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {phase === "contact" && (
                    <form className="contactform" onSubmit={submit} noValidate>
                      <h3 ref={focusRef as React.RefObject<HTMLHeadingElement>} tabIndex={-1} className="builder__q">{title}</h3>
                      {(Object.keys(errors).length > 0 || serverErr) && (
                        <div role="alert" className="form-alert">
                          {serverErr || "Please check the highlighted fields."}
                          {serverErr && siteConfig.contactEmail && <> You can also write to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</>}
                        </div>
                      )}
                      <div className="contactform__grid">
                        <Field id={`${uid}-name`} name="name" label="Name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
                        <Field id={`${uid}-email`} name="email" type="email" label="Work email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
                        <Field id={`${uid}-company`} name="company" label="Company" autoComplete="organization" value={form.company} onChange={set("company")} error={errors.company} optional />
                        <Field id={`${uid}-url`} name="url" type="url" inputMode="url" label="Link or repository" value={form.url} onChange={set("url")} error={errors.url} optional />
                      </div>
                      <Field id={`${uid}-context`} name="context" textarea rows={3} label="Anything we should know?" value={form.context} onChange={set("context")} error={errors.context} optional />
                      <fieldset className="timeline">
                        <legend className="mono mono--muted">TIMELINE (OPTIONAL)</legend>
                        <div className="timeline__opts">
                          {TIMELINES.map((t) => (
                            <label key={t} data-checked={form.timeline === t}>
                              <input type="radio" name="timeline" className="sr-only" checked={form.timeline === t} onChange={() => setForm((f) => ({ ...f, timeline: t }))} />
                              <span>{t}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="hp" aria-hidden>
                        <label>Website<input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={set("website")} /></label>
                      </div>
                      <p className="body-s mono--muted">By sending this you agree to be contacted about your project.</p>
                      <Button type="submit" size="lg" loading={status === "sending"} aria-disabled={status === "sending"} onClick={status === "sending" ? (e) => e.preventDefault() : undefined}>
                        {status === "sending" ? "Sending..." : "Send brief"}
                      </Button>
                    </form>
                  )}

                  {phase === "done" && (
                    <div className="done" role="status">
                      <span className="done__tick" aria-hidden><Check /></span>
                      <h3 ref={focusRef as React.RefObject<HTMLHeadingElement>} tabIndex={-1} className="builder__q">Brief received.</h3>
                      <p className="body-l">We&apos;ll review the system you described and reply using the contact details you provided.</p>
                      <p className="body-s">{lines.line1}</p>
                      {siteConfig.whatsappUrl && (
                        <a className="link-cta" href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">Message us</a>
                      )}
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
            </div>

            {phase !== "done" && (
              <div className="builder__bar">
                <button type="button" className="icon-btn" onClick={back} aria-label="Back" disabled={phase === "q" && step === 0}>
                  <ArrowLeft />
                </button>
                {phase === "q" && (
                  <Button onClick={next} size="lg" className="builder__next">{step === 2 ? "See my brief" : "Continue"}</Button>
                )}
              </div>
            )}
          </div>

          <BuilderStage needs={needs} stage={stage} goal={goal} />
        </div>
      </div>
    </section>
  );
}
