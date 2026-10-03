export type HeroModule = { name: string; sub: string; accent: string; accentOpacity: number };

/** Top to bottom, exactly as specified (research §17.2). */
export const heroModules: HeroModule[] = [
  { name: "DEPLOY", sub: "CI/CD · monitoring · release", accent: "#38D39F", accentOpacity: 0.4 },
  { name: "API", sub: "integrations · webhooks · services", accent: "#55D7FF", accentOpacity: 0.45 },
  { name: "CRM", sub: "pipeline · tasks · follow up", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "DATA", sub: "schemas · sync · reporting", accent: "#55D7FF", accentOpacity: 0.45 },
  { name: "AUTOMATION", sub: "triggers · routing · messaging", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "AI", sub: "agents · vision · retrieval", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "PRODUCT", sub: "SaaS · web apps · internal tools", accent: "#F0F2F5", accentOpacity: 0.4 },
];

/** Mobile object uses four modules to cut legibility and geometry load. */
export const heroModulesMobile = heroModules.filter((m) => ["DEPLOY", "AUTOMATION", "AI", "PRODUCT"].includes(m.name));
