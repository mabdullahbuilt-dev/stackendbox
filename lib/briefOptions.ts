/** Builder option lists (no validation library, safe for the initial client bundle). */
export const NEEDS = ["SaaS / MVP", "Web Application", "AI System", "Automation", "CRM / Internal Tool", "API / Integration", "Custom Software", "Not sure"] as const;
export const STAGES = ["Idea", "Prototype", "Existing Product", "Manual Process", "Production System"] as const;
export const GOALS = ["Launch", "Automate", "Scale", "Add AI", "Integrate", "Improve UX", "Improve Reliability", "Something else"] as const;
export const TIMELINES = ["As soon as possible", "1 to 3 months", "Just exploring"] as const;
export type Need = (typeof NEEDS)[number];
