import type { Need } from "@/lib/briefOptions";

export type Lab = {
  id: "leados" | "listingreel" | "dealsignal" | "supportgrid" | "tablepilot" | "connecthub" | "opsboard" | "launchkit";
  category: string;
  name: string;
  headline: string;
  text: string;
  tags: string[];
  cta: string;
  need: Need;
  sr: string;
};

/** Order matters: sales, support, integration, SaaS, booking and operations lead. Property specific builds are the minority. */
export const primaryLabs: Lab[] = [
  { id: "leados", category: "Sales automation", name: "LeadOS", headline: "From new lead to booked meeting.", text: "A lead arrives, gets qualified, assigned, messaged and booked, and the CRM updates itself along the way.", tags: ["AI qualification", "CRM", "Messaging", "Calendar"], cta: "Automate Lead Operations", need: "Automation", sr: "LeadOS: a new lead enters the pipeline, is scored by AI, assigned to an owner, receives a follow up message and a meeting is booked." },
  { id: "supportgrid", category: "AI support", name: "SupportGrid", headline: "Resolve routine support automatically. Escalate the rest.", text: "AI answers what it knows with sources. Anything uncertain reaches a person with a summary.", tags: ["Retrieval", "Confidence", "Escalation", "Summaries"], cta: "Build an AI Support System", need: "AI System", sr: "SupportGrid: a routine ticket is resolved by AI with cited sources, while a low confidence ticket is escalated to a human with a summary." },
  { id: "connecthub", category: "Integrations", name: "ConnectHub", headline: "Payments, CRM, email and analytics in sync.", text: "One payment event updates every system that needs to know.", tags: ["APIs", "Webhooks"], cta: "Connect Your Stack", need: "API / Integration", sr: "ConnectHub: a payment event updates the CRM, sends an email and records analytics, and each event is verified." },
  { id: "launchkit", category: "SaaS product", name: "LaunchKit", headline: "From sign up to subscription.", text: "Auth, plans, billing, dashboard and admin in a product ready to scale.", tags: ["Auth", "Billing"], cta: "Build Your SaaS", need: "SaaS / MVP", sr: "LaunchKit: a user signs up, chooses a plan and lands in a dashboard with billing, roles and an admin area." },
];

export const secondaryLabs: Lab[] = [
  { id: "tablepilot", category: "Booking", name: "TablePilot", headline: "Bookings, messages and orders in one flow.", text: "Guest requests become confirmed bookings and updated dashboards.", tags: ["Booking", "Messaging"], cta: "Automate Bookings", need: "Automation", sr: "TablePilot: a guest message becomes a confirmed table booking with a confirmation and an updated reservation grid." },
  { id: "opsboard", category: "Internal operations", name: "OpsBoard", headline: "Tasks, approvals and reporting for process driven teams.", text: "Requests route by rule, get approved and feed the weekly report.", tags: ["Internal tools", "Approvals"], cta: "Build Internal Software", need: "CRM / Internal Tool", sr: "OpsBoard: a task is routed by a rule, approved and reflected in a weekly report." },
  { id: "listingreel", category: "Media automation", name: "ListingReel AI", headline: "Turn a property listing into a publish ready reel.", text: "Photos, script, voice and editing become one automated media pipeline.", tags: ["Vision", "Script", "Voice", "Video"], cta: "Build a Content Workflow", need: "Automation", sr: "ListingReel AI: property photos are analyzed, the best shots are chosen, a script and voice are generated and a vertical reel is assembled and marked ready to publish." },
  { id: "dealsignal", category: "Property intelligence", name: "DealSignal", headline: "Surface high priority property opportunities automatically.", text: "Photos, listing language and market signals combine into an explainable opportunity score.", tags: ["Image analysis", "Listing analysis", "Scoring", "Alerts"], cta: "Build a Scoring System", need: "AI System", sr: "DealSignal: a property is analyzed from its photos and listing text, an explainable opportunity score is calculated, and a qualified property triggers an alert." },
];
