"use client";
import { AnimatePresence, m } from "motion/react";
import { Box, Brain, CalendarClock, Cable, Database, KeyRound, LayoutDashboard, Link2, Plug, Shield, Users, Workflow, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { buildBrief } from "@/lib/briefTemplate";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { StatusChip } from "@/components/ui/StatusChip";

const ICONS: Record<string, LucideIcon> = {
  "App UI": LayoutDashboard, Auth: KeyRound, Billing: Link2, Database, Model: Brain, Context: Database, Approval: Shield,
  Triggers: Workflow, Scheduler: CalendarClock, Messaging: Plug, Pipeline: Workflow, Contacts: Users, Tasks: Box,
  Connectors: Cable, Webhooks: Plug, Sync: Link2, Admin: LayoutDashboard, Roles: KeyRound, Reports: Database,
  Calendar: CalendarClock, Availability: CalendarClock, Reminders: Plug, "Custom module": Box, Tests: Shield, Connector: Cable, Monitoring: Shield,
};

export function BuilderStage({ needs, stage, goal }: { needs: string[]; stage: string; goal: string }) {
  const { reduced } = useMotionPreference();
  const b = useMemo(() => buildBrief(needs, stage, goal), [needs, stage, goal]);
  const visible = b.modules.slice(0, 6);
  const extra = b.modules.length - visible.length;
  const count = b.modules.length + (b.foundation ? 1 : 0) + (b.accent ? 1 : 0);
  const t = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30 };
  const summary = count ? `${count} modules selected: ${[b.foundation, ...b.modules, b.accent].filter(Boolean).join(", ")}.` : "No modules selected yet.";

  return (
    <div className="builder__stage-wrap">
      <p className="sr-only" aria-live="polite">{summary}</p>
      <div className="bstage stage-grid" aria-hidden>
        <div className="bstage__top">
          <StatusChip tone={count ? "accent" : "muted"}>{count ? "ASSEMBLING" : "WAITING"}</StatusChip>
          <span className="mono tnum">{count} MODULES</span>
        </div>
        <m.div layout transition={t} className="bstage__plates">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((mod, i) => {
              const Icon = ICONS[mod] ?? Box;
              return (
                <m.div
                  key={mod}
                  layout
                  initial={reduced ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ ...t, delay: reduced ? 0 : i * 0.04 }}
                  className="plate"
                  data-custom={mod === "Custom module"}
                >
                  <Icon aria-hidden />
                  <span>{mod}</span>
                </m.div>
              );
            })}
            {extra > 0 && (
              <m.div key="more" layout className="plate plate--more" transition={t}>
                <span className="mono">+{extra}</span>
              </m.div>
            )}
          </AnimatePresence>
          {visible.length === 0 && [0, 1, 2, 3].map((i) => <div key={i} className="plate plate--empty slotbox" />)}
        </m.div>
        <div className="bstage__base">
          <AnimatePresence initial={false} mode="popLayout">
            {b.foundation && (
              <m.div key={b.foundation} layout initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={t} className="foundation">
                <span className="mono mono--muted">FOUNDATION</span>
                <strong>{b.foundation}</strong>
              </m.div>
            )}
            {b.accent && (
              <m.div key={b.accent} layout initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={t} className="accent-chip mono">
                {b.accent}
              </m.div>
            )}
          </AnimatePresence>
          {!b.foundation && <div className="foundation slotbox foundation--empty"><span className="mono mono--muted">Foundation</span></div>}
        </div>
      </div>
      <div className="bstrip" aria-hidden>
        {[b.foundation, ...b.modules, b.accent].filter(Boolean).map((x) => (
          <span key={x} className="chip chip--mono">{x}</span>
        ))}
        {count === 0 && <span className="chip chip--mono">Your system builds here</span>}
      </div>
    </div>
  );
}
