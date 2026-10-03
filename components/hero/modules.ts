export type HeroModule = { name: string; sub: string; accent: string; accentOpacity: number };

/** Top to bottom. Buyer-readable layer names; accents follow the palette (orange builds, green is live). */
export const heroModules: HeroModule[] = [
  { name: "DELIVERY", sub: "Testing, deployment, monitoring", accent: "#2fd27a", accentOpacity: 0.28 },
  { name: "INTEGRATIONS", sub: "Payments, messaging, third party systems", accent: "#ff7a1a", accentOpacity: 0.3 },
  { name: "OPERATIONS", sub: "Customers, pipelines, internal workflows", accent: "#ff963f", accentOpacity: 0.3 },
  { name: "DATA", sub: "Models, reporting, synchronization", accent: "#f7f8f5", accentOpacity: 0.3 },
  { name: "AUTOMATION", sub: "Tasks, routing, notifications", accent: "#ff7a1a", accentOpacity: 0.3 },
  { name: "AI", sub: "Agents, retrieval, vision, workflows", accent: "#ff963f", accentOpacity: 0.3 },
  { name: "PRODUCT", sub: "SaaS, web apps, dashboards", accent: "#ff7a1a", accentOpacity: 0.55 },
];

/** Mobile object uses four modules to cut legibility and geometry load. */
export const heroModulesMobile = heroModules.filter((m) => ["DELIVERY", "AUTOMATION", "AI", "PRODUCT"].includes(m.name));
