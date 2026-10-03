import Link from "next/link";
import { copy } from "@/content/copy";
import { siteConfig } from "@/site.config";
import { Logo } from "./Logo";
import { MotionToggle } from "./MotionToggle";

const solutions = ["Product / SaaS", "AI applications", "Automation", "CRM & internal systems", "APIs & integrations", "Custom software"];

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
              <h2 className="mono mono--muted">Solutions</h2>
              <ul>
                {solutions.map((s) => (
                  <li key={s}>
                    <Link href="/#explorer">{s}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Work</h2>
              <ul>
                <li><Link href="/#proof">Demo systems</Link></li>
                <li><Link href="/#work">Engineering work</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Company</h2>
              <ul>
                <li><Link href="/#process">Process</Link></li>
                <li><Link href="/#start">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mono mono--muted">Contact</h2>
              <ul>
                <li><Link href="/#start">Start a Project</Link></li>
                {siteConfig.contactEmail && <li><a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a></li>}
                {siteConfig.schedulingUrl && <li><a href={siteConfig.schedulingUrl} target="_blank" rel="noopener noreferrer">Schedule a Call</a></li>}
                {siteConfig.whatsappUrl && <li><a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">Message us</a></li>}
                {social.map((s) => (
                  <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                ))}
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
