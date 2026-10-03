import Link from "next/link";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Page not found | StackEndBox", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="main" className="container nf">
        <p className="eyebrow">404</p>
        <h1 className="h-xl">This page isn&apos;t part of the stack.</h1>
        <p className="body-l">The link may be old or mistyped. Start from the homepage, or tell us what you&apos;re building.</p>
        <div className="nf__ctas">
          <ButtonLink href="/" variant="secondary" size="lg" arrow={false}>Back to the homepage</ButtonLink>
          <ButtonLink href="/#start" size="lg">Start a Project</ButtonLink>
        </div>
        <Link href="/" className="sr-only">Home</Link>
      </main>
      <Footer />
    </>
  );
}
