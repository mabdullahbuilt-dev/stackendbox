import type { BriefInput } from "./briefSchema";

const NEED_MODULES: Record<string, string[]> = {
  "SaaS / MVP": ["App UI", "Auth", "Billing", "Database"],
  "Web Application": ["App UI", "Auth", "API", "Database"],
  "AI System": ["Model", "Retrieval", "Tool API", "Approval", "Output"],
  Automation: ["Triggers", "Scheduler", "Messaging"],
  "CRM / Internal Tool": ["Pipeline", "Contacts", "Tasks", "Admin"],
  "API / Integration": ["Connectors", "Webhooks", "Sync"],
  "Custom Software": ["Custom module"],
  "Web3 / Blockchain": ["Wallet", "Contracts", "Indexer"],
  "Trading / Data Platform": ["Data feed", "Rules", "Alerts"],
  "Not sure": ["Discovery"],
};

const STAGE_FOUNDATION: Record<string, { label: string; extra?: string }> = {
  Idea: { label: "Blank foundation" },
  Prototype: { label: "Harden prototype", extra: "Tests" },
  "Existing Product": { label: "Existing app", extra: "Connector" },
  "Manual Process": { label: "Manual input" },
  "Production System": { label: "Production system", extra: "Monitoring" },
};

const GOAL_ACCENT: Record<string, string> = {
  Launch: "DEPLOY",
  Automate: "AUTOMATION",
  Scale: "QUEUE · CACHE",
  "Add AI": "AI MODULE",
  Integrate: "CONNECTORS",
  "Improve UX": "UX REVIEW",
  "Improve Reliability": "TESTS · MONITORING",
  "Something else": "CUSTOM GOAL",
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
export function buildBrief(needs: readonly string[], stage: string | undefined, goal: string | undefined): BriefParts {
  const modules: string[] = [];
  for (const n of needs) for (const m of NEED_MODULES[n] ?? []) if (!modules.includes(m)) modules.push(m);
  const f = stage ? STAGE_FOUNDATION[stage] : undefined;
  if (f?.extra && !modules.includes(f.extra)) modules.push(f.extra);
  return { needs: [...needs], stage: stage ?? "", goal: goal ?? "", modules, foundation: f?.label ?? "", accent: goal ? GOAL_ACCENT[goal] ?? "" : "" };
}

export function briefLines(b: BriefParts) {
  return {
    line1: `${b.needs.join(" + ")} · ${b.stage} · Goal: ${b.goal}`,
    line2: `Suggested starting scope: ${[b.foundation, ...b.modules, b.accent].filter(Boolean).join(" · ")}`,
  };
}
