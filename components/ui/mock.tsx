import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "./StatusChip";

/** Tiny primitives for building believable demo UI out of DOM (no screenshots). */
export function Line({ w = "100%", h = 8, tone, style }: { w?: string | number; h?: number; tone?: "strong" | "blue"; style?: CSSProperties }) {
  return <i className="mk-line" data-tone={tone} style={{ width: w, height: h, ...style }} />;
}
export function Pill({ children, tone = "muted", mono = true }: { children: ReactNode; tone?: Tone; mono?: boolean }) {
  return <span className={`mk-pill ${mono ? "mono" : ""}`} data-tone={tone}>{children}</span>;
}
export function Avatar({ children }: { children: ReactNode }) {
  return <span className="mk-avatar">{children}</span>;
}
export function Tile({ label, value, tone }: { label: string; value: string; tone?: "cyan" | "green" | "blue" }) {
  return (
    <div className="mk-tile">
      <span className="mono mono--muted">{label}</span>
      <b className="tnum" data-tone={tone}>{value}</b>
    </div>
  );
}
export function Bars({ values, tone = "blue" }: { values: number[]; tone?: "blue" | "cyan" | "green" }) {
  return (
    <div className="mk-bars" data-tone={tone}>
      {values.map((v, i) => (
        <i key={i} style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}
export function Bubble({ children, me, tone }: { children: ReactNode; me?: boolean; tone?: "green" }) {
  return <div className="mk-bubble" data-me={me} data-tone={tone}>{children}</div>;
}
