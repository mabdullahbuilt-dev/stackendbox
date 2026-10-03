import { BuilderLink } from "@/components/ui/BuilderLink";
import { CalButton } from "@/components/ui/CalButton";
import Link from "next/link";
import { copy } from "@/content/copy";
import { siteConfig } from "@/site.config";
import { Logo } from "./Logo";
import { MotionToggle } from "./MotionToggle";

const services = ["SaaS & MVPs", "Web Applications", "Custom & Internal Software", "AI Systems", "APIs & Integrations", "Automation", "Specialized Software"];

export function Footer() {
  const social = [
    siteConfig.githubUrl && { label: "GitHub", href: siteConfig.githubUrl },
    siteConfig.socials.linkedin && { label: "LinkedIn", href: siteConfig.socials.linkedin },
    siteConfig.socials.x && { label: "X", href: siteConfig.socials.x },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo markHeight={36} />
            <p className="body-s">{copy.footer.tagline}</p>
          </div>
          <nav className="footer__cols" aria-label="Footer">
            <div>
              <h2 className="mono mono--muted">Services</h2>
              <ul>{services.map((s) => <li key={s}><Link href="/#services">{s}</Link></li>)}</ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Work</h2>
              <ul>
                <li><Link href="/#work">Selected Builds</Link></li>
                <li><Link href="/#proof">Capability Proof</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Company</h2>
              <ul>
                <li><Link href="/#process">How We Build</Link></li>
                <li><BuilderLink source="footer-contact">Contact</BuilderLink></li>
              </ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Contact</h2>
              <ul>
                <li><BuilderLink source="footer-start">Start a Project</BuilderLink></li>
                {siteConfig.contactEmail && <li><a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a></li>}
                {siteConfig.calUrl && <li><CalButton placement="footer" className="link-btn" icon={false} /></li>}
                {siteConfig.whatsappUrl && <li><a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
                {social.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}
              </ul>
            </div>
          </nav>
        </div>
        <div className="footer__bottom">
          <span className="mono mono--muted">© 2026 StackEndBox</span>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
