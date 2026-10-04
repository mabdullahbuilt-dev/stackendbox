import { describe, expect, it } from "vitest";
import { briefSchema } from "@/lib/briefSchema";
import { briefLines, buildBrief } from "@/lib/briefTemplate";
import { rateLimit } from "@/lib/rateLimit";

describe("brief template", () => {
  it("builds modules deterministically and de-duplicates", () => {
    const b = buildBrief(["SaaS / MVP", "AI System"], "Prototype", "Add AI");
    expect(b.modules).toEqual(["App UI", "Auth", "Billing", "Database", "Model", "Retrieval", "Tool API", "Approval", "Output", "Tests"]);
    expect(b.foundation).toBe("Harden prototype");
    expect(b.accent).toBe("AI MODULE");
    expect(briefLines(b).line1).toBe("SaaS / MVP + AI System · Prototype · Goal: Add AI");
  });
});

describe("brief schema", () => {
  const ok = { needs: ["Automation"], stage: "Idea", goal: "Launch", name: "A", email: "a@b.co", context: "We need a portal" };
  it("accepts a valid brief", () => expect(briefSchema.safeParse(ok).success).toBe(true));
  it("rejects bad email, missing context and filled honeypot", () => {
    expect(briefSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...ok, context: "" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...ok, website: "x" }).success).toBe(false);
  });
  it("categories, stage and goal are optional and Web3 / Trading are valid", () => {
    expect(briefSchema.safeParse({ name: "A", email: "a@b.co", context: "Build a thing" }).success).toBe(true);
    expect(briefSchema.safeParse({ ...ok, needs: ["Web3 / Blockchain", "Trading / Data Platform", "AI System", "Automation"] }).success).toBe(true);
  });
  it("validates optional url", () => {
    expect(briefSchema.safeParse({ ...ok, url: "" }).success).toBe(true);
    expect(briefSchema.safeParse({ ...ok, url: "https://github.com/a/b" }).success).toBe(true);
    expect(briefSchema.safeParse({ ...ok, url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("rate limit", () => {
  it("blocks after the limit", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("t", 5, 1000).ok).toBe(true);
    expect(rateLimit("t", 5, 1000).ok).toBe(false);
  });
});
