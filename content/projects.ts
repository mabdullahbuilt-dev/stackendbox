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
  { slug: "resolve", title: "RESOLVE", featured: true, text: "An economic intelligence platform that observes verified activity across code, research, music and media, then turns it into funding programs, payout policies and settlement.", tags: ["Value routing", "Evidence engine", "Payments", "Web3"], imageAlt: "RESOLVE value routing engine connecting source activity to funding and settlement." },
  { slug: "meridian", title: "MERIDIAN", featured: true, text: "A market intelligence system that turns live data into testable strategy, with explainable rules and permit gated execution.", tags: ["Market data", "Strategy engine", "Backtesting", "Execution"], imageAlt: "MERIDIAN market intelligence home screen." },
  { slug: "repodiet", title: "RepoDiet", text: "Repository cleanup as a delivery contract: evidence backed analysis, scoped approval, isolated execution and a reviewable pull request.", tags: ["Repository analysis", "Agents", "PR delivery"], imageAlt: "RepoDiet delivery engine from analysis to pull request." },
  { slug: "agora-forge", title: "Agora Forge", text: "A cross chain execution desk that routes USDC with Circle CCTP, compares routes in real time and settles swaps.", tags: ["Cross chain", "Routing", "Settlement"], imageAlt: "Agora Forge execution desk with live multichain quotes." },
  { slug: "xroga", title: "Xroga", text: "An AI app builder that turns a Web3 idea into a working project, with repository aware edits and preview verification.", tags: ["AI builder", "Repository edits", "Previews", "Web3"], imageAlt: "Xroga AI app builder landing page." },
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
