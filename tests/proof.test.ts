import { describe, expect, it } from "vitest";
import { proofMatrix } from "@/content/proofMatrix";
import { proofItems } from "@/content/proof";
import { projects } from "@/content/projects";
import { scenarios } from "@/content/transformations";
import { testimonials } from "@/content/testimonials";
import { clients } from "@/content/clients";
import { caseStudies } from "@/content/caseStudies";

describe("proof architecture", () => {
  it("every core service has at least one proof", () => {
    for (const [k, v] of Object.entries(proofMatrix)) expect(v.length, k).toBeGreaterThan(0);
  });
  it("proof references point at things that exist", () => {
    const ids = new Set(proofItems.map((p) => p.id));
    const slugs = new Set(projects.map((p) => p.slug as string));
    const sc = new Set(scenarios.map((s) => s.id as string));
    for (const refs of Object.values(proofMatrix)) for (const r of refs) {
      if (r.kind === "proof") expect(ids.has(r.id as never), r.id).toBe(true);
      if (r.kind === "selected-build") expect(slugs.has(r.id), r.id).toBe(true);
      if (r.kind === "transformation") expect(sc.has(r.id), r.id).toBe(true);
    }
  });
  it("proof spans several categories without a real estate or lead bias", () => {
    expect(new Set(proofItems.map((p) => p.tab)).size).toBe(proofItems.length);
    expect(proofItems.length).toBeGreaterThanOrEqual(6);
  });
  it("social proof only exposes verified and permissioned entries", () => {
    expect(testimonials.every((t) => t.verified && t.permissionConfirmed)).toBe(true);
    expect(clients.every((c) => c.verified && c.permissionConfirmed)).toBe(true);
    expect(caseStudies.every((c) => c.verified && c.permissionConfirmed)).toBe(true);
  });
});
