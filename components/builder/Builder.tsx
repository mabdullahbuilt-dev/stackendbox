"use client";
import { ArrowRight, CalendarClock, Check, Mail, Phone, Send } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { siteConfig, telHref } from "@/site.config";
import { track } from "@/lib/analytics";
import type { Need } from "@/lib/briefOptions";
import { intentNeed, readIntent } from "@/lib/intent";
import { Reveal } from "@/components/ui/Reveal";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { CalButton } from "@/components/ui/CalButton";
import { Turnstile } from "./Turnstile";

const CHIPS: { need: Need; label: string }[] = [
  { need: "SaaS / MVP", label: "Product / SaaS" },
  { need: "Web Application", label: "Web App" },
  { need: "Custom Software", label: "Custom Software" },
  { need: "AI System", label: "AI" },
  { need: "Automation", label: "Automation" },
  { need: "CRM / Internal Tool", label: "Internal Software" },
  { need: "API / Integration", label: "Integrations" },
  { need: "Web3 / Blockchain", label: "Web3 / Blockchain" },
  { need: "Trading / Data Platform", label: "Trading / Data" },
  { need: "Not sure", label: "Not sure" },
];

function Field({ id, label, error, textarea, optional, ...p }: { id: string; label: string; error?: string; textarea?: boolean; optional?: boolean; rows?: number } & React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement>) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div className="field" data-invalid={!!error}>
      <Tag id={id} placeholder=" " aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...(p as object)} />
      <label htmlFor={id}>{label}{optional && <em> (optional)</em>}</label>
      {error && <p id={`${id}-err`} className="field__err">{error}</p>}
    </div>
  );
}

/** One simple brief: type freely, optionally tag the area, or skip the form and email or book a call. */
export function Builder() {
  const uid = useId();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [form, setForm] = useState({ name: "", email: "", company: "", context: "", url: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [serverErr, setServerErr] = useState("");
  const [turnstile, setTurnstile] = useState("");
  // Synchronous guard: a double click lands before React re-renders the disabled button.
  const inFlight = useRef(false);
  const onToken = useCallback((t: string) => setTurnstile(t), []);
  const email = siteConfig.contactEmail;

  // CTAs elsewhere on the page preselect an area and ask us to focus the brief.
  useEffect(() => {
    const initial = readIntent();
    if (initial) setNeeds((n) => (n.length ? n : [intentNeed[initial]]));
    const onPreset = (e: Event) => {
      const need = (e as CustomEvent<{ need: Need }>).detail?.need;
      if (need) setNeeds([need]);
    };
    const onFocus = () => (document.getElementById(`${uid}-context`) as HTMLElement | null)?.focus({ preventScroll: true });
    window.addEventListener("seb:builder-preset", onPreset);
    window.addEventListener("seb:builder-focus", onFocus);
    return () => { window.removeEventListener("seb:builder-preset", onPreset); window.removeEventListener("seb:builder-focus", onFocus); };
  }, [uid]);

  const toggle = (n: Need) => { setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n])); track("builder_chip", { need: n }); };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const f: Record<string, string> = {};
    if (!form.name.trim()) f.name = "Tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) f.email = "That email doesn't look right.";
    if (form.context.trim().length < 5) f.context = "Tell us a little about what you need.";
    if (form.url.trim() && !/^https?:\/\/\S+\.\S+/i.test(form.url.trim())) f.url = "Enter a full link starting with https://";
    if (Object.keys(f).length) {
      setErrors(f);
      const first = Object.keys(f)[0];
      (document.getElementById(`${uid}-${first}`) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({}); setStatus("sending"); setServerErr("");
    inFlight.current = true;
    track("builder_submitted", { needs: needs.join("|") });
    const payload = {
      needs, name: form.name, email: form.email, company: form.company, context: form.context, url: form.url, website: form.website,
      source: typeof location !== "undefined" ? location.pathname + location.hash : "", referrer: typeof document !== "undefined" && document.referrer ? (() => { try { return new URL(document.referrer).origin; } catch { return ""; } })() : "",
      turnstileToken: turnstile,
    };
    try {
      const res = await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (res.ok && body.ok) {
        track("contact_submit_success");
        setForm({ name: "", email: "", company: "", context: "", url: "", website: "" }); setNeeds([]);
        setStatus("done"); inFlight.current = false; return;
      }
      if (body.fields) setErrors(body.fields);
      setServerErr(
        body.error === "verification_failed" ? "We couldn't verify this request. Please refresh the check and try again."
          : body.error === "rate_limited" ? "Too many attempts. Please wait a few minutes and try again."
          : body.error === "validation" ? "Please check the highlighted fields."
          : "We couldn't send the brief. Your message is still here.",
      );
      track("builder_error", { field: body.error ?? "unknown" });
    } catch {
      setServerErr("We couldn't send the brief. Check your connection; your message is still here.");
      track("builder_error", { field: "network" });
    }
    inFlight.current = false;
    setStatus("error");
  };

  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent("Project enquiry")}${form.context.trim() ? `&body=${encodeURIComponent(form.context.trim().slice(0, 1500))}` : ""}` : undefined;

  return (
    <section id="start" className="section builder" aria-labelledby="builder-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.builder.eyebrow}</p>
          <h2 id="builder-title" className="h2" tabIndex={-1}>{copy.builder.title}</h2>
          <p className="body-l">{copy.builder.support}</p>
        </Reveal>

        <div className="ct">
          <div className="ct__card">
            {status === "done" ? (
              <div className="ct__done" role="status">
                <span className="ct__doneic"><Check aria-hidden /></span>
                <h3>Brief sent.</h3>
                <p>We received your project details and will review them. If you would rather talk it through, book a call or email us.</p>
                <div className="ct__actions">
                  <CalButton placement="done" />
                  {mailto && <a className="btn btn--lg btn--secondary" href={`mailto:${email}`}><Mail aria-hidden />Email StackEndBox</a>}
                  <button type="button" className="btn btn--lg btn--ghost" onClick={() => setStatus("idle")}>Send another brief</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate aria-describedby={serverErr ? `${uid}-srv` : undefined}>
                <div className="ct__row">
                  <Field id={`${uid}-name`} label="Name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required />
                  <Field id={`${uid}-email`} label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
                </div>
                <Field id={`${uid}-company`} label="Company" name="organization" autoComplete="organization" value={form.company} onChange={set("company")} optional />
                <Field id={`${uid}-context`} label="What do you need built?" textarea rows={6} name="context" value={form.context} onChange={set("context")} error={errors.context} required />
                <Field id={`${uid}-url`} label="Project link or repository" name="url" inputMode="url" value={form.url} onChange={set("url")} error={errors.url} optional />

                <fieldset className="ct__chips">
                  <legend className="mono mono--muted">AREA (OPTIONAL, PICK ANY)</legend>
                  <div className="choices">
                    {CHIPS.map((c) => (
                      <button key={c.need} type="button" className="choice choice--btn" aria-pressed={needs.includes(c.need)} data-checked={needs.includes(c.need)} onClick={() => toggle(c.need)}>
                        <span>{c.label}</span><Check aria-hidden className="choice__check" />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hp" value={form.website} onChange={set("website")} />
                <Turnstile onToken={onToken} />

                {serverErr && (
                  <div id={`${uid}-srv`} className="ct__err" role="alert">
                    <p>{serverErr}</p>
                    <p className="ct__alt">
                      Please try again{email && <>, email <a href={mailto}>{email}</a></>}
                      {calParts_available() && ", or "}
                      {calParts_available() && <CalButton placement="error" className="ct__link" icon={false}>book a call</CalButton>}.
                    </p>
                  </div>
                )}

                <div className="ct__submit">
                  <button type="submit" className="btn btn--primary btn--lg" disabled={status === "sending"}>
                    {status === "sending" ? "Sending brief…" : "Send Project Brief"}<Send className="arrow" aria-hidden />
                  </button>
                  <span className="mono mono--muted">{copy.builder.time}</span>
                </div>
              </form>
            )}
          </div>

          <aside className="ct__side" aria-labelledby={`${uid}-reach`}>
            <h3 id={`${uid}-reach`} className="mono ct__sidehd">Contact us</h3>
            <ul className="ct__ways">
              {email && (
                <li>
                  <a className="ct__way" href={`mailto:${email}`} onClick={() => track("contact_clicked", { placement: "builder", kind: "email" })}>
                    <span className="ct__ic" aria-hidden><Mail /></span>
                    <span className="ct__txt"><b>Email</b><span className="ct__val">{email}</span><span className="ct__sub">Send details, files or questions.</span></span>
                    <ArrowRight className="ct__go" aria-hidden />
                  </a>
                </li>
              )}
              {siteConfig.whatsappUrl && (
                <li>
                  <a className="ct__way ct__way--wa" href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Message StackEndBox on WhatsApp" onClick={() => track("contact_clicked", { placement: "builder", kind: "whatsapp" })}>
                    <span className="ct__ic" aria-hidden><BrandIcon name="whatsapp" size={20} /></span>
                    <span className="ct__txt"><b>WhatsApp</b><span className="ct__val">Message StackEndBox</span><span className="ct__sub">A direct conversation with the team.</span></span>
                    <ArrowRight className="ct__go" aria-hidden />
                  </a>
                </li>
              )}
              {siteConfig.calUrl && (
                <li>
                  <CalButton placement="builder" className="ct__way" icon={false}>
                    <span className="ct__ic" aria-hidden><CalendarClock /></span>
                    <span className="ct__txt"><b>Book a call</b><span className="ct__val">Choose a time</span><span className="ct__sub">Talk it through with an engineer.</span></span>
                    <ArrowRight className="ct__go" aria-hidden />
                  </CalButton>
                </li>
              )}
            </ul>
            {siteConfig.contactPhone && (
              <p className="ct__phone mono">
                <Phone aria-hidden />
                <a href={telHref(siteConfig.contactPhone)} onClick={() => track("contact_clicked", { placement: "builder", kind: "phone" })}>{siteConfig.contactPhone}</a>
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function calParts_available() { return !!siteConfig.calUrl; }
