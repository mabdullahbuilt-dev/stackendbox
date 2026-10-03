import type { Capability } from "@/lib/intent";

export type Demo = {
  id: "leados" | "tablepilot" | "connecthub" | "supportgrid" | "opsboard" | "launchkit";
  name: string;
  line: string;
  tags: string[];
  cap: Capability;
  need: string;
  sr: string;
};

/**
 * StackEndBox Lab demo systems. All data is fabricated sample data and every scene
 * carries visible DEMO SYSTEM + SAMPLE DATA labels. Names are working names.
 */
export const demos: Demo[] = [
  { id: "leados", name: "LeadOS", line: "Qualify, route and follow up every lead — automatically.", tags: ["AI scoring", "CRM pipeline", "Messaging", "Scheduling"], cap: "automation", need: "Automation", sr: "LeadOS: a new lead is scored by AI, moves to Qualified, receives a follow-up message and a meeting changes from Pending to Booked. Sample data." },
  { id: "tablepilot", name: "TablePilot", line: "Bookings, messages and orders in one flow.", tags: ["Booking", "Messaging", "Ordering", "Automation"], cap: "automation", need: "Booking system", sr: "TablePilot: a guest message arrives, an AI proposes a table slot, the reservation grid fills and a confirmation is sent. Sample data." },
  { id: "connecthub", name: "ConnectHub", line: "Payments, CRM, email and analytics — finally in sync.", tags: ["APIs", "Webhooks", "Payments", "Data sync"], cap: "integrations", need: "Integration", sr: "ConnectHub: a payment event updates the CRM, sends an email and stores an analytics event; each event verifies from pending to verified. Sample data." },
  { id: "supportgrid", name: "SupportGrid", line: "AI handles the routine. People get the exceptions.", tags: ["AI agents", "Retrieval", "Escalation", "Support"], cap: "ai", need: "AI", sr: "SupportGrid: AI resolves a routine ticket with cited sources while a low-confidence ticket escalates to a human with a summary. Sample data." },
  { id: "opsboard", name: "OpsBoard", line: "Tasks, approvals and reporting for a team that runs on process.", tags: ["Internal tools", "Workflow", "Approvals", "Reporting"], cap: "crm", need: "Internal system", sr: "OpsBoard: a task is routed by a rule, an approval is requested and approved, and the weekly report updates. Sample data." },
  { id: "launchkit", name: "LaunchKit", line: "From sign-up to subscription, in a product that's ready to scale.", tags: ["Auth", "Billing", "Dashboard", "Admin"], cap: "product", need: "Product", sr: "LaunchKit: a user signs up, selects a plan and lands in a dashboard with billing, roles and an admin panel behind it. Sample data." },
];
