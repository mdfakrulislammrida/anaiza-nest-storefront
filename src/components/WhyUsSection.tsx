import type { WhyUsReason } from "@/lib/types";

// "Why Anaiza Nest": up to five short lines the admin wrote (or inserted from the brand kit). Empty by
// default, and an empty section renders nothing at all -- no heading, no gap.
export default function WhyUsSection({
  title,
  subtitle,
  reasons,
}: {
  title?: string | null;
  subtitle?: string | null;
  reasons: WhyUsReason[];
}) {
  if (reasons.length === 0) return null;

  return (
    <section className="bg-linen">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8">
          <h2 className="font-serif text-charcoal text-h2">{title || "Why Anaiza Nest"}</h2>
          {subtitle && <p className="mt-1 text-body text-stone">{subtitle}</p>}
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <li key={`${index}-${reason.line}`} className="border-t border-gold pt-4">
              {reason.title && <p className="font-serif text-body font-semibold text-charcoal">{reason.title}</p>}
              <p className={`text-body text-charcoal/80 ${reason.title ? "mt-1" : ""}`}>{reason.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
