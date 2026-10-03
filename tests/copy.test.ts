import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";

const BANNED = [
  "transform your business", "innovative solutions", "cutting-edge", "empower", "bring your vision to life",
  "digital transformation", "next-gen", "world-class", "trusted technology partner", "unlock your potential",
  "we craft digital experiences", "future-ready", "seamless solutions", "revolutionize", "one-stop",
  "turn ideas into reality", "your digital partner", "we do everything",
];

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

describe("copy", () => {
  it("contains no banned phrases", () => {
    const all = strings(copy).join("\n").toLowerCase();
    for (const b of BANNED) expect(all, b).not.toContain(b);
  });
  it("has no em dashes or arrow glyphs in public copy", () => {
    const all = strings(copy).join("\n");
    expect(all).not.toContain("\u2014");
    expect(all).not.toContain("\u2192");
  });
  it("has no unresolved [CONFIRM] markers", () => {
    expect(strings(copy).join("\n")).not.toContain("[CONFIRM");
  });
});
