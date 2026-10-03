import type { ReactNode } from "react";

export type Tone = "green" | "amber" | "neutral" | "accent" | "red" | "muted";

export function StatusChip({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`status ${className ?? ""}`} data-tone={tone}>
      <i className="dot" aria-hidden />
      {children}
    </span>
  );
}

export function Chip({ children, mono, className }: { children: ReactNode; mono?: boolean; className?: string }) {
  return <span className={`chip ${mono ? "chip--mono" : ""} ${className ?? ""}`}>{children}</span>;
}
