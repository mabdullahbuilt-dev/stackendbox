import fs from "node:fs";
import path from "node:path";

export type Project = {
  slug: string;
  title: string;
  /** Eyebrow-style category line taken from the project's own site. */
  kicker: string;
  /** One verified sentence (derived from the project's own public copy). */
  description: string;
  tags: string[];
  /** Only set when a real URL has been supplied. Never guessed. */
  liveUrl?: string;
  githubUrl?: string;
  imageAlt: string;
};

/**
 * Real engineering projects. Copy is condensed from each product's own
 * screenshots/headlines. Add `liveUrl` / `githubUrl` only with real URLs.
 */
export const projects: Project[] = [
  {
    slug: "resolve",
    title: "RESOLVE",
    kicker: "Economic intelligence for the open internet",
    description:
      "Observes verified activity across code, research, music and media, then turns the evidence into funding programs, payout policies and Arc settlement.",
    tags: ["Value routing", "Evidence engine", "USDC settlement", "Web3"],
    imageAlt: "RESOLVE value routing engine: source activity flowing through an evidence core to funding blueprint and Arc settlement.",
  },
  {
    slug: "meridian",
    title: "MERIDIAN",
    kicker: "Market intelligence",
    description:
      "Turns live market data into backtestable strategy, with explainable rules and permit-gated execution in a single desk.",
    tags: ["Market data", "Strategy engine", "Permit gates", "Historical replay"],
    imageAlt: "MERIDIAN market intelligence home screen with strategy, NEXUS and PRISM modules.",
  },
  {
    slug: "repodiet",
    title: "RepoDiet",
    kicker: "Repository cleanup delivery",
    description:
      "Turns repository cleanup into a verifiable delivery contract: evidence-backed analysis, scoped approval, isolated execution and a reviewable pull request.",
    tags: ["Repository analysis", "A2MCP", "A2A", "PR delivery"],
    imageAlt: "RepoDiet delivery engine showing analyze, approve, execute, verify and deliver stages.",
  },
  {
    slug: "agora-forge",
    title: "Agora Forge",
    kicker: "Cross-chain execution desk",
    description:
      "Routes USDC with Circle CCTP, compares LI.FI paths in real time and settles swaps across Ethereum, Base, Arbitrum and Arc.",
    tags: ["Circle CCTP", "LI.FI routing", "Arc", "Portfolio data"],
    imageAlt: "Agora Forge execution desk with live multichain quotes and supported networks.",
  },
  {
    slug: "xroga",
    title: "Xroga",
    kicker: "AI app builder",
    description:
      "An AI app builder that turns a Web3 or blockchain idea into a working project, with repository-aware edits and preview verification.",
    tags: ["AI app builder", "Repository-aware edits", "Preview & verification", "Web3"],
    imageAlt: "Xroga landing page: start a Web3 project with a free AI app builder.",
  },
];

const exts = ["avif", "webp", "png", "jpg"] as const;

/** Resolves a project screenshot from /public/work if one has been added. */
export function projectImage(slug: string): string | undefined {
  for (const ext of exts) {
    const rel = `/work/${slug}.${ext}`;
    if (fs.existsSync(path.join(process.cwd(), "public", rel))) return rel;
  }
  return undefined;
}
