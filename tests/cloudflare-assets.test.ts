import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { materializePublicAssets } from "../scripts/cloudflare-public-assets";
const root = resolve(import.meta.dirname, "..");
describe("Worker public asset compatibility", () => {
  it("resolves the real gallery screenshots without runtime filesystem calls", () => {
    const id = resolve(root, "content/projects.ts");
    const result = materializePublicAssets(readFileSync(id, "utf8"), id, root)!;
    expect(result).not.toContain("fs.existsSync");
    expect(result).not.toContain('from "node:fs"');
    for (const slug of ["resolve", "meridian", "repodiet", "agora-forge", "xroga"]) {
      expect(existsSync(resolve(root, `public/work/${slug}.webp`))).toBe(true);
      expect(result).toContain(`/work/${slug}.webp`);
    }
  });
  it.each(["opengraph-image", "twitter-image"])("preserves %s brand bytes without Worker fs", name => {
    const id = resolve(root, `app/${name}.tsx`);
    const result = materializePublicAssets(readFileSync(id, "utf8"), id, root)!;
    expect(result).not.toContain("readFileSync");
    expect(result).toContain(readFileSync(resolve(root, "public/brand/mark.png")).toString("base64"));
    expect(result).toContain(readFileSync(resolve(root, "public/brand/wordmark.png")).toString("base64"));
    expect(result).toContain("new ImageResponse");
  });
  it("does not transform unrelated application code", () => {
    expect(materializePublicAssets("unchanged", resolve(root, "app/page.tsx"), root)).toBeNull();
  });
  it("fails clearly if the gallery resolver changes", () => {
    expect(() => materializePublicAssets("changed", resolve(root, "content/projects.ts"), root)).toThrow("resolver changed");
  });
});
