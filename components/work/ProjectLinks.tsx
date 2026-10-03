"use client";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";

/** Renders only links that exist. Nothing is shown (and no dead href) when no URL has been supplied. */
export function ProjectLinks({ slug, liveUrl, githubUrl, cta }: { slug: string; liveUrl?: string; githubUrl?: string; cta: string }) {
  if (!liveUrl && !githubUrl) return null;
  return (
    <div className="wk__links">
      {liveUrl && (
        <a className="link-cta" href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("project_opened", { project: slug })}>
          {cta}<ArrowUpRight aria-hidden />
        </a>
      )}
      {githubUrl && (
        <a className="link-cta link-cta--quiet" href={githubUrl} target="_blank" rel="noopener noreferrer">
          View source <ArrowUpRight aria-hidden />
        </a>
      )}
    </div>
  );
}
