/**
 * Central business configuration. Any value left empty is treated as
 * "not available" and the UI that depends on it is omitted (never a dead link).
 */
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const siteConfig = {
  companyName: "StackEndBox",
  domain: "www.stackendbox.com",
  url: env(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://www.stackendbox.com",
  contactEmail: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  schedulingUrl: env(process.env.NEXT_PUBLIC_SCHEDULING_URL),
  whatsappUrl: env(process.env.NEXT_PUBLIC_WHATSAPP_URL),
  githubUrl: env(process.env.NEXT_PUBLIC_GITHUB_URL),
  socials: {
    linkedin: env(process.env.NEXT_PUBLIC_LINKEDIN_URL),
    x: env(process.env.NEXT_PUBLIC_X_URL),
  },
  analyticsEndpoint: env(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT),
} as const;

export type SiteConfig = typeof siteConfig;
