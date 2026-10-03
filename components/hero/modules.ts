export type HeroModule = { name: string; sub: string; accent: string; accentOpacity: number };

/** Top → bottom, exactly as specified (research §17.2). */
export const heroModules: HeroModule[] = [
  { name: "DEPLOY", sub: "ci/cd · monitoring · hardening", accent: "#38D39F", accentOpacity: 0.4 },
  { name: "API", sub: "integrations · webhooks · oauth", accent: "#55D7FF", accentOpacity: 0.45 },
  { name: "CRM", sub: "pipeline · routing · follow-up", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "DATA", sub: "schemas · sync · reporting", accent: "#55D7FF", accentOpacity: 0.45 },
  { name: "AUTOMATION", sub: "triggers · queues · messaging", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "AI", sub: "agents · llm workflows · retrieval", accent: "#6F8DFF", accentOpacity: 0.45 },
  { name: "PRODUCT", sub: "web · mobile · admin", accent: "#F0F2F5", accentOpacity: 0.4 },
];

/** Mobile object uses four modules to cut legibility and geometry load. */
export const heroModulesMobile = heroModules.filter((m) => ["DEPLOY", "AUTOMATION", "AI", "PRODUCT"].includes(m.name));
