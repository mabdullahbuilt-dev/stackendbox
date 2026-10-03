"use client";
import { ArrowRight, Bell, BarChart3, Calendar, Check, CircleCheck, FileText, Film, Image as Img, Mail, MessageSquare, Mic, Music, PenLine, Phone, Scissors, Table2, Type, Upload, UsersRound, ClipboardList, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { scenarios } from "@/content/transformations";
import { track } from "@/lib/analytics";
import { useInView } from "@/lib/hooks";
import { presetBuilder } from "@/lib/intent";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { Reveal } from "@/components/ui/Reveal";

const icons: Record<string, LucideIcon> = { form: ClipboardList, sheet: Table2, mail: Mail, check: CircleCheck, crm: UsersRound, msg: MessageSquare, cal: Calendar, chart: BarChart3, phone: Phone, bell: Bell, users: UsersRound, file: FileText, image: Img, scissors: Scissors, pen: PenLine, mic: Mic, film: Film, music: Music, type: Type, upload: Upload };

export function Transformation() {
  const { reduced } = useMotionPreference();
  const [tab, setTab] = useState(0);
  const [state, setState] = useState<"before" | "after">("after");
  const stage = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const inView = useInView(stage, "-25% 0px -25% 0px");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sc = scenarios[tab];
  const [step, setStep] = useState(-1);
  const token = useRef<HTMLDivElement>(null);
  const count = useRef(8);

  // The same object travels through the automated flow, one stage at a time.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const items = [...st.querySelectorAll<HTMLElement>(".tfi")].filter((e) => getComputedStyle(e).display !== "none");
    count.current = items.length;
    if (state !== "after") { setStep(-1); return; }
    if (reduced) { setStep(items.length - 1); return; }
    let k = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      setStep(0);
      id = setInterval(() => { k += 1; if (k >= items.length) { clearInterval(id); return; } setStep(k); }, 640);
    }, 1100);
    return () => { clearTimeout(t0); clearInterval(id); };
  }, [state, tab, reduced]);
  useEffect(() => {
    const st = stage.current; const tk = token.current;
    if (!st || !tk || step < 0) return;
    const el = st.querySelectorAll<HTMLElement>(".tfi")[step];
    if (!el) return;
    const a = st.getBoundingClientRect(); const b = el.getBoundingClientRect();
    tk.style.translate = `${b.left - a.left + b.width * 0.5 - tk.offsetWidth / 2}px ${b.top - a.top - tk.offsetHeight - 8}px`;
  }, [step]);

  // On first view play the transformation once (before then after). Reduced motion keeps the final state.
  useEffect(() => {
    if (reduced) { setState("after"); return; }
    if (!seen.current) setState("before");
  }, [reduced]);
  useEffect(() => {
    if (reduced || !inView || seen.current) return;
    seen.current = true;
    const t = setTimeout(() => { setState("after"); track("scene_complete", { scene: "transformation" }); }, 900);
    return () => clearTimeout(t);
  }, [inView, reduced]);

  const pick = (i: number) => {
    setTab(i);
    track("transformation_selected", { scenario: scenarios[i].id });
    if (!reduced) {
      setState("before");
      setTimeout(() => setState("after"), 1100);
    }
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = scenarios.length;
    let i = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (tab + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (tab - 1 + n) % n;
    if (i >= 0) { e.preventDefault(); pick(i); tabs.current[i]?.focus(); }
  };

  return (
    <section id="transform" className="section tf" aria-labelledby="tf-title">
      <div className="container">
        <Reveal className="sec-head">
          <p className="eyebrow">{copy.transform.eyebrow}</p>
          <h2 id="tf-title" className="h2">{copy.transform.title}</h2>
          <p className="body-l">{copy.transform.support}</p>
        </Reveal>

        <div className="tf__bar">
          <div className="tf__tabs" role="tablist" aria-label="Processes" onKeyDown={onKey}>
            {scenarios.map((s, i) => (
              <button key={s.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`tf-${s.id}`} aria-selected={tab === i} aria-controls="tf-panel" tabIndex={tab === i ? 0 : -1} className="itab" data-active={tab === i} onClick={() => pick(i)}>{s.tab}</button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Show the process before or after automation">
            <button aria-pressed={state === "before"} onClick={() => setState("before")}>{copy.transform.before}</button>
            <button aria-pressed={state === "after"} onClick={() => { setState("after"); seen.current = true; }}>{copy.transform.after}</button>
          </div>
        </div>

        <div id="tf-panel" role="tabpanel" aria-labelledby={`tf-${sc.id}`}>
          <div className="tf__stage" ref={stage} data-state={state} data-sc={sc.id}>
            <div className="tf__label tf__label--b mono">BEFORE</div>
            <div className="tf__label tf__label--a mono">AFTER <i className="vd" /></div>
            <div ref={token} className="tf__token" data-show={state === "after" && step >= 0} aria-hidden><i />{sc.token}</div>
            {sc.items.map((it, i) => {
              const Icon = icons[it.icon] ?? FileText;
              return (
                <div
                  key={sc.id + i}
                  className="tfi"
                  data-on={state === "after" && step >= i} data-tone={it.before.tone} data-n={i + 1} data-par={i % 2 === 0 ? "odd" : "even"}
                  style={{ ["--i" as string]: i, ["--bx" as string]: it.before.x, ["--by" as string]: it.before.y, ["--br" as string]: it.before.r, ["--ax" as string]: it.after.x, ["--ay" as string]: it.after.y }}
                >
                  <span className="tfi__ic"><Icon aria-hidden /></span>
                  <span className="tfi__t">
                    <span className="tfi__b"><b>{it.before.title}</b><em>{it.before.sub}</em></span>
                    <span className="tfi__a"><b>{it.after.title}</b><em>{it.after.sub}</em></span>
                  </span>
                  <Check className="tfi__ok" aria-hidden />
                </div>
              );
            })}
          </div>
          <div className="tf__foot">
            <p className="body-l" aria-live="polite"><strong>{sc.headline}.</strong> {state === "before" ? sc.beforeNote : sc.afterNote}</p>
            <Link href="/#start" className="btn btn--primary" onClick={() => { track("cta_click", { placement: "transformation", scenario: sc.id }); presetBuilder(sc.need); }}>{sc.cta}<ArrowRight className="arrow" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
