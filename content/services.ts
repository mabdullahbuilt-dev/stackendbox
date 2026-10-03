import type { Need } from "@/lib/briefOptions";

export type Service = {
  id: "saas" | "web" | "custom" | "ai" | "automation" | "crm" | "api" | "web3" | "trading";
  n: string;
  title: string;
  text: string;
  cta: string;
  need: Need;
};

/** Nine service families. Each has one distinct engineering visual (components/services/visuals.tsx). */
export const services: Service[] = [
  { id: "saas", n: "01", title: "SaaS & MVPs", text: "Authentication, billing, admin and the product itself, shipped to production.", cta: "Build Your MVP", need: "SaaS / MVP" },
  { id: "web", n: "02", title: "Web Applications", text: "Fast, responsive, customer-facing products with real UX engineering.", cta: "Discuss Your App", need: "Web Application" },
  { id: "ai", n: "04", title: "AI Systems", text: "AI built into your software: retrieval, tools and human approval.", cta: "Discuss an AI System", need: "AI System" },
  { id: "custom", n: "03", title: "Custom Software & Platforms", text: "Industry platforms, developer tools and systems that fit no template.", cta: "Scope Custom Software", need: "Custom Software" },
  { id: "crm", n: "06", title: "CRM & Internal Software", text: "Management systems with roles, records, reporting and an audit trail.", cta: "Build Internal Software", need: "CRM / Internal Tool" },
  { id: "api", n: "07", title: "APIs & Integrations", text: "Backends, webhooks and mappings between the systems you depend on.", cta: "Discuss Your Integration", need: "API / Integration" },
  { id: "automation", n: "05", title: "Automation", text: "Repeated work turned into software that finishes it.", cta: "Discuss Process Software", need: "Automation" },
  { id: "web3", n: "08", title: "Web3 & Blockchain", text: "Wallet-connected apps, contract interfaces, indexing and transaction flows.", cta: "Scope a Web3 Product", need: "Web3 / Blockchain" },
  { id: "trading", n: "09", title: "Trading, Market & Data Platforms", text: "Real-time data, rules, alerts and risk interfaces for data-intensive products.", cta: "Scope a Data Platform", need: "Trading / Data Platform" },
];
