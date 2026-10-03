import type { BriefInput } from "./briefSchema";

const NEED_MODULES: Record<string, string[]> = {
  Product: ["App UI", "Auth", "Billing", "Database"],
  AI: ["Model", "Context", "Approval"],
  Automation: ["Triggers", "Scheduler", "Messaging"],
  CRM: ["Pipeline", "Contacts", "Tasks"],
  Integration: ["Connectors", "Webhooks", "Sync"],
  "Internal system": ["Admin", "Roles", "Reports"],
  "Booking system": ["Calendar", "Availability", "Reminders"],
  "Something else": ["Custom module"],
};

const STAGE_FOUNDATION: Record<string, { label: string; extra?: string }> = {
  Idea: { label: "Blank foundation" },
  Prototype: { label: "Harden prototype", extra: "Tests" },
  "Manual workflow": { label: "Manual input" },
  "Existing application": { label: "Existing system", extra: "Connector" },
  Production: { label: "Production system", extra: "Monitoring" },
};

const GOAL_ACCENT: Record<string, string> = {
  Launch: "DEPLOY",
  Automate: "AUTOMATION",
  Scale: "QUEUE · CACHE",
  "Improve reliability": "TESTS · MONITORING",
  "Add AI": "AI MODULE",
  "Connect systems": "CONNECTORS",
  "Improve UX": "UX REVIEW",
};

export type BriefParts = {
  needs: string[];
  stage: string;
  goal: string;
  modules: string[];
  foundation: string;
  accent: string;
};

/** Deterministic brief (no AI call). Used by the UI stage, the result card and the server message. */
export function buildBrief(needs: readonly string[], stage: string, goal: string): BriefParts {
  const modules: string[] = [];
  for (const n of needs) for (const m of NEED_MODULES[n] ?? []) if (!modules.includes(m)) modules.push(m);
  const f = STAGE_FOUNDATION[stage];
  if (f?.extra && !modules.includes(f.extra)) modules.push(f.extra);
  return { needs: [...needs], stage, goal, modules, foundation: f?.label ?? "", accent: GOAL_ACCENT[goal] ?? "" };
}

export function briefLines(b: BriefParts) {
  return {
    line1: `${b.needs.join(" + ")} · ${b.stage} · Goal: ${b.goal}`,
    line2: `Suggested starting scope: ${[b.foundation, ...b.modules, b.accent].filter(Boolean).join(" · ")}`,
  };
}

export function briefText(input: BriefInput) {
  const b = buildBrief(input.needs, input.stage, input.goal);
  const l = briefLines(b);
  return [
    "New StackEndBox brief",
    "",
    `Need: ${b.needs.join(", ")}`,
    `Stage: ${b.stage}`,
    `Goal: ${b.goal}`,
    l.line2,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.company ? `Company: ${input.company}` : "",
    input.timeline ? `Timeline: ${input.timeline}` : "",
    input.url ? `Link: ${input.url}` : "",
    input.context ? `\nContext:\n${input.context}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
}
