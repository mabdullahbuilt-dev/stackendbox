/**
 * Verified social-proof data. Intentionally EMPTY at launch: the slot components render nothing
 * until real, permissioned entries are added here. Never add placeholder names, logos or metrics.
 */
export type Testimonial = { quote: string; name: string; role: string; company: string };
export type TrustLogo = { name: string; src: string; href?: string };
export type TrustMetric = { label: string; value: string; source: string; date: string };

export const testimonials: Testimonial[] = [];
export const logos: TrustLogo[] = [];
export const metrics: TrustMetric[] = [];
