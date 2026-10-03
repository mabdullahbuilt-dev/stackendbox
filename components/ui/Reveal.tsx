"use client";
import { m } from "motion/react";
import type { ReactNode } from "react";
import { useMotionPreference } from "@/lib/useMotionPreference";

/** Entrance: 24px rise, 600ms ease-out, once. Content is present in SSR HTML. */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "span";
  className?: string;
  y?: number;
}) {
  const { reduced } = useMotionPreference();
  const Tag = m[as] as typeof m.div;
  return (
    <Tag
      className={`reveal ${className ?? ""}`}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
