"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { ButtonLink } from "@/components/ui/Button";

export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button className="icon-btn nav__menu-btn" aria-label="Menu">
          <Menu />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content className="menu-sheet" aria-describedby={undefined}>
          <div className="menu-sheet__top">
            <Dialog.Title className="mono">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <button className="icon-btn" aria-label="Close">
                <X />
              </button>
            </Dialog.Close>
          </div>
          <ul className="menu-sheet__links">
            {copy.nav.links.map((l, i) => (
              <li key={l.id} style={{ ["--i" as string]: i }}>
                <Dialog.Close asChild>
                  <Link href={l.href} onClick={() => track("nav_link_click", { link: l.id })}>
                    {l.label}
                  </Link>
                </Dialog.Close>
              </li>
            ))}
          </ul>
          <div className="menu-sheet__cta">
            <Dialog.Close asChild>
              <ButtonLink href="/#start" size="lg" block onClick={() => track("nav_cta_click")}>
                {copy.nav.cta}
              </ButtonLink>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
