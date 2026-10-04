"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";
import { goToBuilder } from "@/lib/intent";
import type { Need } from "@/lib/briefOptions";

/** A real link to #start that scrolls and focuses the brief reliably. Works without JavaScript too. */
export function BuilderLink({ children, className, need, source }: { children: ReactNode; className?: string; need?: Need; source: string }) {
  return (
    <Link href="/#start" className={className} onClick={(e) => { track("cta_click", { placement: source }); goToBuilder(e, need, undefined, source); }}>
      {children}
    </Link>
  );
}
