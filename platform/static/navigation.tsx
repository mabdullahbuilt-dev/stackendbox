import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
export function Link({ href, prefetch: _prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) { return <a href={href} {...props} />; }
export function Image({ src, alt, priority, fill, quality: _quality, unoptimized: _unoptimized, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | { src: string }; priority?: boolean; fill?: boolean; quality?: number; unoptimized?: boolean }) {
  // Static delivery intentionally has no request-time Next image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt || ""} src={typeof src === "string" ? src : src.src} loading={priority ? "eager" : props.loading || "lazy"} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...props.style } : props.style} />;
}
const router = { push: (path: string) => window.location.assign(path), replace: (path: string) => window.location.replace(path), refresh: () => window.location.reload() };
export function useRouter() { return router; }
export function useSearchParams() { return new URLSearchParams(window.location.search); }
