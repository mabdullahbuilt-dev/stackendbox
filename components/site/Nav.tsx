"use client";
import Link from "next/link";
import { LayoutGroup, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useMotionPreference } from "@/lib/useMotionPreference";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Nav() {
  const { reduced } = useMotionPreference();
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const state = useRef({ y: 0, fast: 0, frame: 0 });
  const menuRef = useRef(false);
  menuRef.current = menuOpen;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      const s = state.current;
      const d = y - s.y;
      s.y = y;
      setCompact(y >= 72);
      if (d >= 6) s.fast += 1;
      else if (d < 0) {
        s.fast = 0;
        setHidden(false);
      } else s.fast = Math.max(0, s.fast - 1);
      const focusInside = headerRef.current?.contains(document.activeElement) ?? false;
      if (s.fast >= 8 && y > 200 && !menuRef.current && !focusInside && !reduced) setHidden(true);
      if (reduced) setHidden(false);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  useEffect(() => {
    const ids = copy.nav.links.map((l) => l.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const vis = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) vis.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | null = null;
        let max = 0;
        vis.forEach((v, k) => {
          if (v > max) {
            max = v;
            best = k;
          }
        });
        setActive(best);
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0, 0.1, 0.3, 0.6, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const highlight = hover ?? null;

  return (
    <header
      ref={headerRef}
      className="nav"
      data-compact={compact}
      data-hidden={hidden}
      onFocusCapture={() => setHidden(false)}
    >
      <div className="nav__bar">
        <Link href="/" aria-label="StackEndBox home" className="nav__logo">
          <Logo markHeight={compact ? 24 : 28} priority />
        </Link>

        <nav aria-label="Primary" className="nav__links">
          <LayoutGroup id="nav">
            <ul onPointerLeave={() => setHover(null)}>
              {copy.nav.links.map((l) => (
                <li key={l.id}>
                  <Link
                    href={l.href}
                    className="nav__link"
                    aria-current={active === l.id ? "true" : undefined}
                    data-active={active === l.id}
                    onPointerEnter={() => setHover(l.id)}
                    onFocus={() => setHover(l.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => track("nav_link_click", { link: l.id })}
                  >
                    {highlight === l.id && (
                      <m.span
                        layoutId="nav-hl"
                        className="nav__hl"
                        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
                      />
                    )}
                    <span className="nav__text">{l.label}</span>
                    {active === l.id && <span className="nav__dot" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>

        <div className="nav__right">
          <span className="nav__cta">
            <ButtonLink href="/#start" size="md" onClick={() => track("nav_cta_click")}>
              {copy.nav.cta}
            </ButtonLink>
          </span>
          <span className="nav__cta-compact">
            <ButtonLink href="/#start" size="sm" arrow={false} onClick={() => track("nav_cta_click")}>
              Start
            </ButtonLink>
          </span>
          <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
        </div>
      </div>
    </header>
  );
}
