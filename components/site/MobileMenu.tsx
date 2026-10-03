"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Mail, Menu, X } from "lucide-react";
import { copy } from "@/content/copy";
import { goToBuilder } from "@/lib/intent";
import { scrollToHash } from "@/lib/scrollToHash";
import { track } from "@/lib/analytics";
import { ButtonLink } from "@/components/ui/Button";
import { CalButton } from "@/components/ui/CalButton";
import { siteConfig } from "@/site.config";

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
            {[...copy.nav.left, ...copy.nav.right, copy.nav.contact].map((l, i) => (
              <li key={l.id} style={{ ["--i" as string]: i }}>
                <Link href={l.href} onClick={(e) => { track("nav_link_click", { link: l.id }); e.preventDefault(); onOpenChange(false); setTimeout(() => (l.id === "start" ? goToBuilder(undefined) : scrollToHash(l.id)), 160); }}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="menu-sheet__cta">
            <ButtonLink href="/#start" size="lg" block onClick={(e) => { track("nav_cta_click"); e.preventDefault(); onOpenChange(false); setTimeout(() => goToBuilder(undefined), 160); }}>
              {copy.nav.cta}
            </ButtonLink>
            <CalButton className="btn btn--lg btn--secondary btn--block" placement="menu" />
            {siteConfig.contactEmail && (
              <a className="menu-sheet__mail" href={`mailto:${siteConfig.contactEmail}`} onClick={() => track("contact_clicked", { placement: "menu", kind: "email" })}>
                <Mail aria-hidden />{siteConfig.contactEmail}
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
