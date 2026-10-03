import fs from "node:fs";
import path from "node:path";

export type Project = {
  slug: "resolve" | "meridian" | "repodiet" | "agora-forge" | "xroga";
  title: string;
  text: string;
  tags: string[];
  /** Only set with a real URL. Never guessed. */
  liveUrl?: string;
  githubUrl?: string;
  imageAlt: string;
  featured?: boolean;
};

export const projects: Project[] = [
  { slug: "resolve", title: "RESOLVE", featured: true, text: "Evidence based platform that routes funding and payouts to verified work.", tags: ["Value routing", "Evidence engine", "Payments", "Web3"], imageAlt: "RESOLVE value routing engine connecting source activity to funding and settlement." },
  { slug: "meridian", title: "MERIDIAN", text: "Market intelligence that turns live data into testable strategy.", tags: ["Market data", "Strategy engine", "Backtesting", "Execution"], imageAlt: "MERIDIAN market intelligence home screen." },
  { slug: "repodiet", title: "RepoDiet", text: "AI repository cleanup delivered as a reviewable pull request.", tags: ["Repository analysis", "Agents", "PR delivery"], imageAlt: "RepoDiet delivery engine from analysis to pull request." },
  { slug: "agora-forge", title: "Agora Forge", text: "Cross chain execution desk with live routes and settlement.", tags: ["Cross chain", "Routing", "Settlement"], imageAlt: "Agora Forge execution desk with live multichain quotes." },
  { slug: "xroga", title: "Xroga", text: "AI app builder that turns a Web3 idea into a working project.", tags: ["AI builder", "Repository edits", "Previews", "Web3"], imageAlt: "Xroga AI app builder landing page." },
];

const exts = ["avif", "webp", "png", "jpg"] as const;
/** Resolves a real screenshot from /public/work if one has been added. */
export function projectImage(slug: string): string | undefined {
  for (const ext of exts) {
    const rel = `/work/${slug}.${ext}`;
    if (fs.existsSync(path.join(process.cwd(), "public", rel))) return rel;
  }
  return undefined;
}
