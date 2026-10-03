import { describe, expect, it } from "vitest";
import { proofMatrix, realEstateIds } from "@/content/proofMatrix";
import { testimonials } from "@/content/testimonials";
import { clients } from "@/content/clients";
import { caseStudies } from "@/content/caseStudies";
import { primaryLabs, secondaryLabs } from "@/content/labs";

describe("proof architecture", () => {
  it("every core service has at least one proof", () => {
    for (const [k, v] of Object.entries(proofMatrix)) expect(v.length, k).toBeGreaterThan(0);
  });
  it("real estate stays a minority of labs", () => {
    const labs = [...primaryLabs, ...secondaryLabs];
    const re = labs.filter((l) => (realEstateIds as readonly string[]).includes(l.id));
    expect(re.length / labs.length).toBeLessThanOrEqual(0.25);
  });
  it("social proof only exposes verified and permissioned entries", () => {
    expect(testimonials.every((t) => t.verified && t.permissionConfirmed)).toBe(true);
    expect(clients.every((c) => c.verified && c.permissionConfirmed)).toBe(true);
    expect(caseStudies.every((c) => c.verified && c.permissionConfirmed)).toBe(true);
  });
});
