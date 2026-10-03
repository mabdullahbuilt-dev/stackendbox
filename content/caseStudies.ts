/** Reusable client case study shape. Publish only verified facts. Qualitative outcomes are fine. */
export type CaseStudy = {
  id: string;
  client: string;
  industry: string;
  problem: string;
  before: string;
  solution: string;
  whatWeBuilt: string[];
  after: string;
  result?: string;
  metric?: { label: string; value: string };
  testimonialId?: string;
  stack: string[];
  screenshots: string[];
  verified: boolean;
};
export const caseStudies: CaseStudy[] = [];
