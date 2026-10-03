"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";

type Common = { children: ReactNode; size?: "sm" | "md" | "lg"; block?: boolean; arrow?: boolean; className?: string };

function useGlow() {
  const raf = useRef(0);
  return (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
    });
  };
}

const cls = (v: string, { size = "md", block, className }: Common) =>
  ["btn", `btn--${v}`, size === "lg" && "btn--lg", size === "sm" && "btn--sm", block && "btn--block", className]
    .filter(Boolean)
    .join(" ");

export function ButtonLink({
  variant = "primary",
  href,
  arrow = true,
  children,
  ...rest
}: Common & { variant?: "primary" | "secondary"; href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  const glow = useGlow();
  const { size, block, className, ...a } = rest as Common & AnchorHTMLAttributes<HTMLAnchorElement>;
  const external = /^https?:\/\//.test(href);
  const props = {
    className: cls(variant, { children, size, block, className }),
    onPointerMove: variant === "primary" ? glow : undefined,
    ...a,
  };
  const inner = (
    <>
      {children}
      {arrow && variant === "primary" && <ArrowRight className="arrow" aria-hidden />}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {inner}
    </a>
  ) : (
    <Link href={href} {...props}>
      {inner}
    </Link>
  );
}

export function Button({
  variant = "primary",
  loading,
  arrow = true,
  children,
  ...rest
}: Common & { variant?: "primary" | "secondary"; loading?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const glow = useGlow();
  const { size, block, className, ...b } = rest as Common & ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type="button"
      className={cls(variant, { children, size, block, className })}
      onPointerMove={variant === "primary" ? glow : undefined}
      {...b}
    >
      {children}
      {variant === "primary" && arrow && !loading && <ArrowRight className="arrow" aria-hidden />}
      {loading && <span className="spinner" aria-hidden />}
    </button>
  );
}

export function TextLink({
  href,
  children,
  onClick,
  className,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link href={href} className={`link-cta ${className ?? ""}`} onClick={onClick}>
      {children}
    </Link>
  );
}
