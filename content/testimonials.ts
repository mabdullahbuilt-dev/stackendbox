/**
 * Client testimonials. To publish one, add a single entry below.
 * Public rendering requires BOTH verified === true AND permissionConfirmed === true.
 * Leave the array empty until real, permissioned quotes exist. Never add placeholders.
 * Never rewrite a client's words into stronger claims. Do not invent ROI, growth or savings.
 */
export type ServiceCategory = "SaaS" | "MVP" | "Web Application" | "AI" | "Automation" | "CRM" | "Integration" | "Custom Software";

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  companyLogo?: string;
  avatar?: string;
  quote: string;
  service: ServiceCategory;
  project?: string;
  verified: boolean;
  featured?: boolean;
  /** Where the quote came from (email, call recording, review URL). Internal only. */
  source: string;
  permissionConfirmed: boolean;
};

const all: Testimonial[] = [];

export const isPublishable = (t: Pick<Testimonial, "verified" | "permissionConfirmed">) => t.verified === true && t.permissionConfirmed === true;
export const testimonials: Testimonial[] = all.filter(isPublishable);
