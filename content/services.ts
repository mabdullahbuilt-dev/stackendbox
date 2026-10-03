import type { Need } from "@/lib/briefOptions";

export type Service = {
  id: "saas" | "web" | "ai" | "automation" | "crm" | "api" | "custom";
  title: string;
  text: string;
  cta: string;
  need: Need;
};

export const services: Service[] = [
  { id: "saas", title: "SaaS and MVPs", text: "Web and mobile products with the frontend, backend, auth, billing, admin and infrastructure needed to launch.", cta: "Build Your MVP", need: "SaaS / MVP" },
  { id: "web", title: "Web applications", text: "Responsive customer portals, dashboards, platforms and business applications.", cta: "Discuss Your App", need: "Web Application" },
  { id: "ai", title: "AI systems", text: "AI applications, agents, retrieval, vision and decision support with human approval where it matters.", cta: "Build an AI System", need: "AI System" },
  { id: "automation", title: "Automation", text: "Requests, approvals, bookings and reporting turned into workflows that run themselves.", cta: "Automate a Workflow", need: "Automation" },
  { id: "crm", title: "CRM and internal tools", text: "Purpose built systems for sales, operations, support and internal teams.", cta: "Build Internal Software", need: "CRM / Internal Tool" },
  { id: "api", title: "APIs and integrations", text: "Connect the tools, databases and platforms your business already depends on.", cta: "Connect Your Stack", need: "API / Integration" },
  { id: "custom", title: "Custom and specialized software", text: "Market tools, Web3 systems, data products and anything off the shelf software does not cover.", cta: "Scope Custom Software", need: "Custom Software" },
];
