/**
 * Client testimonials. Only REAL, client-approved quotes may be added here (name, optional role, optional avatar,
 * quote, approved). Public rendering requires approved === true. Never add placeholders, invented names, faces,
 * companies, metrics or rewritten claims. Company names are optional and not shown by the showcase design.
 * Development-only sample content lives in testimonials.fixtures.ts and never renders in production builds.
 */
export type Testimonial = {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  quote: string;
  approved: boolean;
  /** Where the quote came from (email, call recording). Internal only, never rendered. */
  source: string;
  /** Optional link to the shipped project the quote is about (project slug). */
  project?: string;
};

const all: Testimonial[] = [];

export const isPublishable = (t: Pick<Testimonial, "approved">) => t.approved === true;
export const testimonials: Testimonial[] = all.filter(isPublishable);
