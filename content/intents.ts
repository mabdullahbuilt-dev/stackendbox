import type { Need } from "@/lib/briefOptions";

export type Intent = {
  id: "saas" | "mvp" | "ai" | "automate" | "crm" | "connect" | "custom" | "other";
  label: string;
  headline: string;
  text: string;
  cta: string;
  need: Need;
};

export const intents: Intent[] = [
  { id: "saas", label: "Launch a SaaS", headline: "A product customers can sign up for.", text: "Interface, mobile version, sign in, billing, database, admin and deployment, designed and built together.", cta: "Discuss Your SaaS", need: "SaaS / MVP" },
  { id: "mvp", label: "Build an MVP", headline: "The smallest version worth launching.", text: "We scope the core flow, build a working first version and get it in front of users.", cta: "Build Your MVP", need: "SaaS / MVP" },
  { id: "ai", label: "Add AI", headline: "AI that takes action inside your product.", text: "Requests, retrieval, models, tool calls and a human approval step where it matters.", cta: "Build an AI System", need: "AI System" },
  { id: "automate", label: "Automate a process", headline: "From incoming work to finished work.", text: "Qualify, route, message, book, update the CRM and report, without anyone copying data by hand.", cta: "Automate This", need: "Automation" },
  { id: "crm", label: "Build a CRM", headline: "One place to run your pipeline.", text: "Contacts, deals, tasks, activity and analytics shaped around how your team sells.", cta: "Build Your CRM", need: "CRM / Internal Tool" },
  { id: "connect", label: "Connect systems", headline: "Your tools, finally in sync.", text: "Payments, CRM, calendar, messaging and databases exchanging data automatically.", cta: "Connect Your Stack", need: "API / Integration" },
  { id: "custom", label: "Custom software", headline: "The tool that doesn't exist yet.", text: "Start from blank modules and assemble exactly the system your business needs.", cta: "Scope Custom Software", need: "Custom Software" },
  { id: "other", label: "Something else", headline: "Describe it. We'll map the build.", text: "Odd requirement, half built prototype or a process nobody has automated yet. Tell us what it is.", cta: "Scope This With Us", need: "Not sure" },
];
