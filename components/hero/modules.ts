export type HeroModule = { name: string; sub: string; accent: string; accentOpacity: number };

/** Top to bottom. Broad engineering layers (what we build), not individual services. Orange builds, green is live. */
export const heroModules: HeroModule[] = [
  { name: "DELIVERY", sub: "Testing, deployment, production", accent: "#2fd27a", accentOpacity: 0.28 },
  { name: "INTEGRATIONS", sub: "Payments, messaging, external systems", accent: "#ff7a1a", accentOpacity: 0.3 },
  { name: "BACKEND", sub: "APIs, business logic, auth, databases", accent: "#f7f8f5", accentOpacity: 0.3 },
  { name: "DATA", sub: "Models, analytics, reporting, real-time systems", accent: "#ff963f", accentOpacity: 0.3 },
  { name: "AI", sub: "Agents, retrieval, vision, intelligent workflows", accent: "#ff7a1a", accentOpacity: 0.3 },
  { name: "SOFTWARE", sub: "Web apps, internal platforms, custom systems", accent: "#ff963f", accentOpacity: 0.3 },
  { name: "PRODUCT", sub: "SaaS, MVPs, digital products", accent: "#ff7a1a", accentOpacity: 0.55 },
];

/** Mobile object uses four modules to cut legibility and geometry load. */
export const heroModulesMobile = heroModules.filter((m) => ["DELIVERY", "AI", "SOFTWARE", "PRODUCT"].includes(m.name));
