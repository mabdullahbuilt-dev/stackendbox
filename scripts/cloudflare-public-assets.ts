import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/** Materialize the existing public assets at build time, not in Worker fs. */
export function materializePublicAssets(code: string, id: string, root: string): string | null {
  const file = id.replaceAll("\\", "/").split("?")[0];
  if (file.endsWith("/content/projects.ts")) {
    const screenshots: Record<string, string> = {};
    for (const slug of ["resolve", "meridian", "repodiet", "agora-forge", "xroga"]) {
      for (const ext of ["avif", "webp", "png", "jpg"]) {
        if (existsSync(join(root, "public", "work", `${slug}.${ext}`))) {
          screenshots[slug] = `/work/${slug}.${ext}`;
          break;
        }
      }
    }
    const pattern = /export function projectImage\(slug: string\): string \| undefined \{[\s\S]*?\n\}/;
    if (!pattern.test(code)) throw new Error("Project asset resolver changed. Review the Cloudflare build adapter.");
    return code.replace(/import (?:fs|path) from "node:(?:fs|path)";\s*/g, "")
      .replace(pattern, `export function projectImage(slug: string): string | undefined { return (${JSON.stringify(screenshots)} as Record<string, string>)[slug]; }`);
  }
  if (/\/app\/(?:opengraph-image|twitter-image)\.tsx$/.test(file)) {
    let count = 0;
    const result = code.replace(/fs\.readFileSync\(path\.join\(process\.cwd\(\), "(public\/brand\/(?:mark|wordmark)\.png)"\)\)\.toString\("base64"\)/g, (_, asset: string) => {
      count++;
      return JSON.stringify(readFileSync(join(root, asset)).toString("base64"));
    });
    if (count !== 2) throw new Error("Brand asset resolver changed. Review the Cloudflare build adapter.");
    return result.replace(/import (?:fs|path) from "node:(?:fs|path)";\s*/g, "");
  }
  return null;
}

export function workerPublicAssets(root: string): Plugin {
  return { name: "stackendbox-worker-public-assets", enforce: "pre", transform(code, id) {
    const result = materializePublicAssets(code, id, root);
    return result === null ? null : { code: result, map: null };
  } };
}
