/**
 * Proof matrix: every core service points to visible proof on the homepage.
 * tests/proof.test.ts fails if a service has no proof or a proof id does not exist.
 */
export type ProofKind = "proof" | "selected-build" | "transformation" | "scene" | "site";
export type ProofRef = { kind: ProofKind; id: string; label: string };

export const proofMatrix: Record<string, ProofRef[]> = {
  "SaaS / MVP": [{ kind: "proof", id: "launchkit", label: "LaunchKit" }, { kind: "scene", id: "product", label: "Idea to product" }, { kind: "selected-build", id: "xroga", label: "Xroga" }],
  "Web Application": [{ kind: "selected-build", id: "resolve", label: "RESOLVE" }, { kind: "scene", id: "product", label: "Idea to product" }],
  "AI Application": [{ kind: "proof", id: "supportgrid", label: "SupportGrid" }, { kind: "scene", id: "ai", label: "AI that does work" }],
  "AI Agents": [{ kind: "proof", id: "supportgrid", label: "SupportGrid" }, { kind: "selected-build", id: "repodiet", label: "RepoDiet" }],
  Automation: [{ kind: "proof", id: "flowops", label: "FlowOps" }, { kind: "transformation", id: "operations", label: "Operations, before and after" }],
  CRM: [{ kind: "transformation", id: "sales", label: "Sales, before and after" }, { kind: "proof", id: "launchkit", label: "LaunchKit" }],
  Booking: [{ kind: "transformation", id: "bookings", label: "Bookings, before and after" }],
  "Internal Software": [{ kind: "proof", id: "flowops", label: "FlowOps" }, { kind: "transformation", id: "operations", label: "Operations, before and after" }],
  "API / Integration": [{ kind: "proof", id: "connecthub", label: "ConnectHub" }, { kind: "scene", id: "integrations", label: "Systems that work together" }],
  "Content Automation": [{ kind: "scene", id: "ai", label: "AI media scenario" }, { kind: "transformation", id: "content", label: "Content, before and after" }],
  "AI Intelligence": [{ kind: "scene", id: "ai", label: "AI intelligence scenario" }, { kind: "selected-build", id: "meridian", label: "MERIDIAN" }],
  Web3: [{ kind: "proof", id: "chaindesk", label: "ChainDesk" }, { kind: "selected-build", id: "agora-forge", label: "Agora Forge" }],
  "Market and Data Platforms": [{ kind: "proof", id: "marketdesk", label: "MarketDesk" }, { kind: "selected-build", id: "meridian", label: "MERIDIAN" }],
  "Custom Software": [{ kind: "selected-build", id: "repodiet", label: "RepoDiet" }, { kind: "scene", id: "depth", label: "Engineering depth" }],
  "Product Rescue": [{ kind: "scene", id: "rescue", label: "Product rescue" }, { kind: "scene", id: "depth", label: "Engineering depth" }],
  "UI / UX": [{ kind: "site", id: "site", label: "This site" }, { kind: "selected-build", id: "meridian", label: "MERIDIAN" }],
};
