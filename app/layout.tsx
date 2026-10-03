import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { copy } from "@/content/copy";
import { siteConfig } from "@/site.config";
import { Providers } from "@/components/site/Providers";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/site.css";
import "@/styles/sections.css";
import "@/styles/scenes.css";
import "@/styles/start.css";
import "@/styles/transform.css";
import "@/styles/product.css";
import "@/styles/rescue.css";
import "@/styles/ai.css";
import "@/styles/depth.css";
import "@/styles/why.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: copy.meta.title,
  description: copy.meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: copy.meta.ogTitle,
    description: copy.meta.description,
    url: siteConfig.url,
    siteName: siteConfig.companyName,
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: copy.meta.ogTitle, description: copy.meta.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050605",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.companyName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/mark.png`,
    description: copy.meta.description,
    ...(siteConfig.githubUrl ? { sameAs: [siteConfig.githubUrl] } : {}),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.companyName,
    url: siteConfig.url,
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} data-motion="full">
      <body>
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
