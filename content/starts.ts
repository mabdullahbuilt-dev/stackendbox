import type { Need } from "@/lib/briefOptions";

export type StartId = "idea" | "mvp" | "prototype" | "existing" | "manual" | "systems" | "ai" | "custom";
export type Start = { id: StartId; label: string; headline: string; cta: string; need: Need; stage: string };

/** Starting points, not services: where the visitor is today decides what the scene shows. */
export const starts: Start[] = [
  { id: "idea", label: "I have an idea", headline: "Shape it into a product.", cta: "Shape the Idea", need: "SaaS / MVP", stage: "Idea" },
  { id: "mvp", label: "I need an MVP", headline: "Launch the first version.", cta: "Build Your MVP", need: "SaaS / MVP", stage: "Idea" },
  { id: "prototype", label: "I have a prototype", headline: "Take it to production.", cta: "Productionize It", need: "Web Application", stage: "Prototype" },
  { id: "existing", label: "I have an existing product", headline: "Improve what is already live.", cta: "Improve a Product", need: "Custom Software", stage: "Existing Product" },
  { id: "manual", label: "I have a manual process", headline: "Replace the busywork.", cta: "Turn It Into Software", need: "Automation", stage: "Manual Process" },
  { id: "custom", label: "I need something custom", headline: "Start from your problem.", cta: "Scope Custom Software", need: "Custom Software", stage: "Idea" },
];
