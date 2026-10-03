import Image from "next/image";
import { logos, metrics, testimonials, type TrustLogo, type TrustMetric, type Testimonial } from "@/content/trust";

/** Reserved slots: render nothing unless real, verified data exists. */
export function TestimonialSlot({ items = testimonials }: { items?: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="tslot">
      {items.map((t) => (
        <figure key={t.name + t.company}>
          <blockquote>“{t.quote}”</blockquote>
          <figcaption>{t.name} · {t.role}, {t.company}</figcaption>
        </figure>
      ))}
    </div>
  );
}
export function LogoWall({ items = logos }: { items?: TrustLogo[] }) {
  if (!items.length) return null;
  return (
    <ul className="tlogos" aria-label="Clients">
      {items.map((l) => <li key={l.name}><Image src={l.src} alt={l.name} width={120} height={40} /></li>)}
    </ul>
  );
}
export function MetricStrip({ items = metrics }: { items?: TrustMetric[] }) {
  if (!items.length) return null;
  return (
    <dl className="tmetrics">
      {items.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd><small>{m.source}, {m.date}</small></div>)}
    </dl>
  );
}
