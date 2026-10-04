import type { Need } from "@/lib/briefOptions";

/**
 * One body of capability proof. Internally these are StackEndBox-built products (kept honest in metadata);
 * publicly they are organized by capability. Every scene is a finished-looking application, not a diagram.
 */
export type ProofId = "launchkit" | "opsboard" | "supportgrid" | "connecthub" | "chaindesk" | "marketdesk";
export type ProofItem = {
  id: ProofId;
  tab: string;
  name: string;
  kind: string;
  text: string;
  tags: [string, string, string];
  brief: string;
  need: Need;
  cta: string;
  /** Number of scripted steps in the scene (see components/proof/apps). */
  steps: number;
};

export const proofItems: ProofItem[] = [
  { id: "launchkit", tab: "Product", name: "LaunchKit", kind: "SaaS workspace", text: "Sign up, provisioning, plans, billing and roles in one product.", tags: ["AUTH", "BILLING", "ADMIN"], brief: "A new customer had to get a workspace, a plan and a team without anyone doing it by hand.", need: "SaaS / MVP", cta: "Build a SaaS Product", steps: 5 },
  { id: "opsboard", tab: "Business", name: "OpsBoard", kind: "Management software", text: "Customers, teams, projects, roles, tasks and reporting in one internal application.", tags: ["ROLES", "RECORDS", "AUDIT"], brief: "Managers needed one place for customers, owners, permissions and reporting, with a record of every change.", need: "CRM / Internal Tool", cta: "Discuss Management Software", steps: 6 },
  { id: "supportgrid", tab: "AI", name: "SupportGrid", kind: "AI support desk", text: "Retrieves context, checks the data and asks a person before it acts.", tags: ["RETRIEVAL", "TOOLS", "APPROVAL"], brief: "Support needed answers from company knowledge, and a human check before anything sensitive ran.", need: "AI System", cta: "Build an AI System", steps: 6 },
  { id: "connecthub", tab: "Integrations", name: "ConnectHub", kind: "Integration operations", text: "Events, webhooks and business systems connected through one operational layer.", tags: ["API", "EVENTS", "SYNC"], brief: "Payments, CRM and messaging had to stay in sync without anyone copying data.", need: "API / Integration", cta: "Discuss Your Integration", steps: 7 },
  { id: "chaindesk", tab: "Specialized", name: "ChainDesk", kind: "Web3 operations", text: "Wallet, transactions and indexed events feeding one application.", tags: ["WALLET", "INDEXING", "ADMIN"], brief: "On chain activity had to drive what users could do inside a normal application.", need: "Custom Software", cta: "Scope a Web3 System", steps: 6 },
  { id: "marketdesk", tab: "Data", name: "MarketDesk", kind: "Market data platform", text: "Live style data, rules and alerts reacting inside one workspace.", tags: ["DATA", "RULES", "ALERTS"], brief: "A team needed data to trigger rules and alerts, with risk state visible at a glance.", need: "Custom Software", cta: "Scope a Data Platform", steps: 6 },
];
