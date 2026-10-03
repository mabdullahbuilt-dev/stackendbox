/**
 * Client testimonials. The section renders only entries with verified === true.
 * Leave this array empty until real, permissioned quotes exist. Never add placeholders.
 */
export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  logo?: string;
  quote: string;
  projectType: string;
  verified: boolean;
};
export const testimonials: Testimonial[] = [];
