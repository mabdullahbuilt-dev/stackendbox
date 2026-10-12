import { describe, expect, it } from "vitest";
import { domainCandidates } from "@/lib/portal/domain-search";
describe("domain discovery candidates", () => {
  it("prioritizes com for a brand name and removes spaces", () => {
    const names = domainCandidates(" Stack And ");
    expect(names[0]).toBe("stackand.com");
    expect(names).toContain("getstackand.com");
    expect(names.length).toBeLessThanOrEqual(20);
    expect(new Set(names).size).toBe(names.length);
  });
  it("preserves the exact requested extension", () => expect(domainCandidates("example.org")[0]).toBe("example.org"));
  it("normalizes unicode labels to ASCII", () => expect(domainCandidates("café")[0]).toBe("xn--caf-dma.com"));
  it("supports internationalized extensions", () => expect(domainCandidates("пример.рф")[0]).toBe("xn--e1afmkfd.xn--p1ai"));
  it("does not attach branding prefixes to raw punycode", () => expect(domainCandidates("café").some(n => n.startsWith("getxn--"))).toBe(false));
  it.each(["", "https://example.com", "x@y.com", "x/y", "-bad", "a".repeat(64)])("rejects invalid input %s", input => expect(() => domainCandidates(input)).toThrow());
});
