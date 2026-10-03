/** Builder option lists (no validation library — safe for the initial client bundle). */
export const NEEDS = ["Product", "AI", "Automation", "CRM", "Integration", "Internal system", "Booking system", "Something else"] as const;
export const STAGES = ["Idea", "Prototype", "Manual workflow", "Existing application", "Production"] as const;
export const GOALS = ["Launch", "Automate", "Scale", "Improve reliability", "Add AI", "Connect systems", "Improve UX"] as const;
export const TIMELINES = ["ASAP", "1–3 months", "Exploring"] as const;
