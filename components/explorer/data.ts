import type { Capability } from "@/lib/intent";

export type ExplorerItem = {
  id: string;
  cap: Capability;
  label: string;
  sentence: string;
  cta: string;
  need: string;
  /** which stage state this item shows */
  state: Capability;
  focusInput?: boolean;
  sr: string;
};

export const explorerItems: ExplorerItem[] = [
  { id: "product", cap: "product", state: "product", label: "PRODUCT / SAAS", sentence: "Launch a customer-facing product, from first idea to production.", cta: "Discuss a Product Build →", need: "Product", sr: "Product: a dashboard with sign-in, billing and admin, shown with sample data." },
  { id: "ai", cap: "ai", state: "ai", label: "AI APPLICATIONS", sentence: "Put AI inside a workflow people actually use.", cta: "Discuss an AI Build →", need: "AI", sr: "AI applications: an agent console with retrieved context, tool calls and a human approval step, shown with sample data." },
  { id: "automation", cap: "automation", state: "automation", label: "AUTOMATION", sentence: "Remove repetitive work from your operation.", cta: "Discuss an Automation →", need: "Automation", sr: "Automation: a lead is scored, routed, messaged and booked, shown with sample data." },
  { id: "crm", cap: "crm", state: "crm", label: "CRM & INTERNAL SYSTEMS", sentence: "Give your team one place to run the business.", cta: "Discuss Your System →", need: "CRM", sr: "CRM and internal systems: a pipeline board with contact, tasks and activity, shown with sample data." },
  { id: "integrations", cap: "integrations", state: "integrations", label: "APIs & INTEGRATIONS", sentence: "Make the systems you already use work together.", cta: "Discuss an Integration →", need: "Integration", sr: "APIs and integrations: tools docking into one sync hub with events and sync status, shown with sample data." },
  { id: "custom", cap: "custom", state: "custom", label: "CUSTOM SOFTWARE", sentence: "Build the tool that doesn't exist yet.", cta: "Describe It →", need: "Something else", sr: "Custom software: a modular, empty system waiting for a problem description." },
  { id: "else", cap: "custom", state: "custom", label: "SOMETHING ELSE", sentence: "Doesn't fit a category? Describe it and we'll scope it.", cta: "Describe It →", need: "Something else", focusInput: true, sr: "Something else: describe the problem and we scope it. Shown with a blank modular system." },
];
