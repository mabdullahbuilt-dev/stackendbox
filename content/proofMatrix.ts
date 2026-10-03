/**
 * Proof matrix: every core service points to visible proof on the homepage.
 * tests/proof.test.ts fails if a service has no proof, or if real estate proof dominates.
 */
export type ProofKind = "selected-build" | "lab" | "transformation" | "scene" | "site";
export type ProofRef = { kind: ProofKind; id: string; label: string };

export const proofMatrix: Record<string, ProofRef[]> = {
  "SaaS / MVP": [{ kind: "lab", id: "launchkit", label: "LaunchKit" }, { kind: "scene", id: "product", label: "Idea to product" }, { kind: "selected-build", id: "xroga", label: "Xroga" }],
  "Web Application": [{ kind: "selected-build", id: "resolve", label: "RESOLVE" }, { kind: "scene", id: "product", label: "Idea to product" }],
  "AI Application": [{ kind: "lab", id: "supportgrid", label: "SupportGrid" }, { kind: "lab", id: "dealsignal", label: "DealSignal" }],
  "AI Agents": [{ kind: "lab", id: "supportgrid", label: "SupportGrid" }, { kind: "selected-build", id: "repodiet", label: "RepoDiet" }],
  Automation: [{ kind: "lab", id: "leados", label: "LeadOS" }, { kind: "transformation", id: "leads", label: "Leads, before and after" }],
  CRM: [{ kind: "lab", id: "leados", label: "LeadOS" }],
  Booking: [{ kind: "lab", id: "tablepilot", label: "TablePilot" }, { kind: "transformation", id: "bookings", label: "Bookings, before and after" }],
  "Internal Software": [{ kind: "lab", id: "opsboard", label: "OpsBoard" }, { kind: "transformation", id: "operations", label: "Operations, before and after" }],
  "API / Integration": [{ kind: "lab", id: "connecthub", label: "ConnectHub" }, { kind: "selected-build", id: "agora-forge", label: "Agora Forge" }],
  "Content Automation": [{ kind: "lab", id: "listingreel", label: "ListingReel AI" }, { kind: "transformation", id: "content", label: "Content, before and after" }],
  "AI Intelligence": [{ kind: "lab", id: "dealsignal", label: "DealSignal" }, { kind: "selected-build", id: "meridian", label: "MERIDIAN" }],
  "Custom Software": [{ kind: "selected-build", id: "repodiet", label: "RepoDiet" }, { kind: "scene", id: "depth", label: "Engineering depth" }],
  "Product Rescue": [{ kind: "scene", id: "rescue", label: "Product rescue" }, { kind: "scene", id: "depth", label: "Engineering depth" }],
  "UI / UX": [{ kind: "site", id: "site", label: "This site" }, { kind: "selected-build", id: "meridian", label: "MERIDIAN" }],
};

/** Ids that are property specific. Together they must stay a small minority of Labs. */
export const realEstateIds = ["listingreel", "dealsignal"] as const;
