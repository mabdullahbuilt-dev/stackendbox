import type { Testimonial } from "./testimonials";

/**
 * DEVELOPMENT ONLY. Layout fixture for the testimonial card. Not a real client, not approved, never rendered in a
 * production build (the showcase only reads this when NODE_ENV === "development"). Replace with real quotes in
 * testimonials.ts.
 */
export const devTestimonialFixtures: Testimonial[] = [
  { id: "dev-fixture-1", name: "Sample name (dev fixture)", role: "Sample role", quote: "Sample quote used only to check the card layout in development. Not a real testimonial.", approved: false, source: "fixture" },
];
