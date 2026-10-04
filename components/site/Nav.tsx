"use client";
import Link from "next/link";
import { LayoutGroup, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { goToBuilder } from "@/lib/intent";
import { track } from "@/lib/analytics";
import { useMotionPreference } from "@/lib/useMotionPreference";
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
    const ids = [...copy.nav.left, ...copy.nav.right, copy.nav.contact].map((l) => l.id);
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

  const item = (l: { id: string; href: string; label: string }) => (
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
          <m.span layoutId="nav-hl" className="nav__hl" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }} />
        )}
        <span className="nav__text">{l.label}</span>
        {active === l.id && <span className="nav__dot" aria-hidden />}
      </Link>
    </li>
  );

  return (
    <header
      ref={headerRef}
      className="nav"
      data-compact={compact}
      data-hidden={hidden}
      onFocusCapture={() => setHidden(false)}
    >
      <div className="nav__bar">
        <nav aria-label="Primary" className="nav__links nav__links--l">
          <LayoutGroup id="nav-l">
            <ul onPointerLeave={() => setHover(null)}>{copy.nav.left.map(item)}</ul>
          </LayoutGroup>
        </nav>

        <Link href="/" aria-label="StackEndBox home" className="nav__logo">
          <Logo stacked markHeight={compact ? 26 : 34} priority />
        </Link>

        <div className="nav__right">
          <nav aria-label="Secondary" className="nav__links nav__links--r">
            <LayoutGroup id="nav-r">
              <ul onPointerLeave={() => setHover(null)}>
                {copy.nav.right.map(item)}
                <li>
                  <Link href={copy.nav.contact.href} className="nav__pill" aria-current={active === "start" ? "true" : undefined} onClick={(e) => { track("nav_cta_click", { link: "contact" }); goToBuilder(e); }}>
                    {copy.nav.contact.label}
                  </Link>
                </li>
              </ul>
            </LayoutGroup>
          </nav>
          <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
        </div>
      </div>
    </header>
  );
}
