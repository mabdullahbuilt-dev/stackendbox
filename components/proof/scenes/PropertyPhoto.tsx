/** Stylised property photographs as SVG (no stock imagery). Variants x palette give twelve distinct frames. */
const palettes = [
  { sky: ["#2a3b57", "#6e86a8"], wall: "#c9b79c", dark: "#30343c", accent: "#d08a4a", ground: "#3d5a45" },
  { sky: ["#1d2a3f", "#55708f"], wall: "#a9b4c0", dark: "#242a33", accent: "#5fa8d3", ground: "#2f4a3c" },
];

export type PhotoKind = "house" | "living" | "kitchen" | "bedroom" | "bath" | "pool";
export const photoKinds: PhotoKind[] = ["house", "living", "kitchen", "bedroom", "bath", "pool"];

export function PropertyPhoto({ kind, tone = 0, className }: { kind: PhotoKind; tone?: 0 | 1; className?: string }) {
  const p = palettes[tone];
  const id = `g-${kind}-${tone}`;
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient>
      </defs>
      {kind === "house" && (<>
        <rect width="120" height="80" fill={`url(#${id})`} />
        <rect y="58" width="120" height="22" fill={p.ground} />
        <rect x="26" y="30" width="68" height="34" fill={p.wall} />
        <polygon points="20,32 60,10 100,32" fill={p.dark} />
        <rect x="52" y="42" width="14" height="22" fill={p.accent} />
        <rect x="32" y="38" width="14" height="12" fill={p.sky[1]} /><rect x="74" y="38" width="14" height="12" fill={p.sky[1]} />
      </>)}
      {kind === "living" && (<>
        <rect width="120" height="80" fill={p.wall} />
        <rect y="56" width="120" height="24" fill="#5b4a3a" />
        <rect x="64" y="14" width="40" height="30" fill={`url(#${id})`} /><rect x="83" y="14" width="2" height="30" fill={p.wall} />
        <rect x="14" y="40" width="48" height="18" rx="4" fill={p.dark} /><rect x="14" y="34" width="48" height="10" rx="4" fill="#3a404a" />
        <rect x="100" y="44" width="2" height="16" fill={p.dark} /><ellipse cx="101" cy="42" rx="6" ry="4" fill={p.accent} />
      </>)}
      {kind === "kitchen" && (<>
        <rect width="120" height="80" fill={p.wall} />
        <rect y="60" width="120" height="20" fill="#4b4036" />
        <rect x="8" y="14" width="104" height="16" fill={p.dark} /><rect x="8" y="36" width="104" height="22" fill="#2e333b" />
        <rect x="8" y="34" width="104" height="3" fill="#d9dde3" />
        <rect x="30" y="50" width="60" height="14" rx="2" fill={p.accent} opacity="0.85" />
        <circle cx="38" cy="8" r="4" fill="#f2d9a6" /><circle cx="60" cy="8" r="4" fill="#f2d9a6" /><circle cx="82" cy="8" r="4" fill="#f2d9a6" />
      </>)}
      {kind === "bedroom" && (<>
        <rect width="120" height="80" fill={p.wall} />
        <rect y="58" width="120" height="22" fill="#54483c" />
        <rect x="24" y="22" width="60" height="14" fill={p.dark} />
        <rect x="20" y="36" width="68" height="24" rx="4" fill="#d7dce3" /><rect x="20" y="46" width="68" height="14" fill={p.accent} opacity="0.8" />
        <rect x="94" y="16" width="18" height="26" fill={`url(#${id})`} />
      </>)}
      {kind === "bath" && (<>
        <rect width="120" height="80" fill="#cfd5db" />
        <rect y="56" width="120" height="24" fill="#8f98a3" />
        <rect x="14" y="14" width="30" height="26" rx="3" fill={`url(#${id})`} opacity="0.7" />
        <ellipse cx="78" cy="56" rx="34" ry="12" fill="#f3f5f7" /><ellipse cx="78" cy="53" rx="28" ry="8" fill={p.accent} opacity="0.45" />
        <rect x="52" y="30" width="3" height="20" fill="#9aa3ae" />
      </>)}
      {kind === "pool" && (<>
        <rect width="120" height="80" fill={`url(#${id})`} />
        <rect y="46" width="120" height="34" fill="#b9a98f" />
        <rect x="14" y="52" width="92" height="22" rx="3" fill={p.accent} /><rect x="14" y="52" width="92" height="6" rx="3" fill="#bfe6f5" opacity="0.5" />
        <rect x="0" y="36" width="120" height="12" fill={p.ground} />
        <polygon points="96,36 108,22 120,36" fill={p.dark} />
      </>)}
    </svg>
  );
}
