/**
 * Client case studies. Publish only verified, permissioned facts. Qualitative outcomes are fine.
 * Layout contract: problem, before, what we built, after, result, technology, testimonial.
 */
export type CaseStudy = {
  slug: string;
  client: string;
  industry: string;
  service: string;
  problem: string;
  before: string[];
  solution: string;
  whatWeBuilt: string[];
  after: string[];
  results: string[];
  metrics: Metric[];
  testimonialId?: string;
  screenshots: string[];
  stack: string[];
  liveUrl?: string;
  verified: boolean;
  permissionConfirmed: boolean;
};

/** A public metric must be verified. Never add arbitrary numbers for visual impact. */
export type Metric = { label: string; value: string; verified: boolean };

const all: CaseStudy[] = [];
export const caseStudies: CaseStudy[] = all.filter((c) => c.verified === true && c.permissionConfirmed === true).map((c) => ({ ...c, metrics: c.metrics.filter((m) => m.verified === true) }));
