import { brands, type BrandKey } from "@/content/brandIcons";

export function BrandIcon({ name, size = 24, color, className }: { name: BrandKey; size?: number; color?: string; className?: string }) {
  const b = brands[name];
  return (
    <svg role="img" aria-label={b.title} viewBox="0 0 24 24" width={size} height={size} className={className} fill={color ?? "currentColor"}>
      <path d={b.path} />
    </svg>
  );
}
