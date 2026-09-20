import Link from "next/link";

const PRICE_RANGES = [
  { label: "Under ৳1,500", min: undefined, max: 1500 },
  { label: "৳1,500 – ৳3,000", min: 1500, max: 3000 },
  { label: "৳3,000 – ৳6,000", min: 3000, max: 6000 },
  { label: "Above ৳6,000", min: 6000, max: undefined },
] as const;

export default function PriceFilterPanel({
  buildHref,
  activeMin,
  activeMax,
}: {
  buildHref: (overrides: { min_price?: number; max_price?: number }) => string;
  activeMin?: number;
  activeMax?: number;
}) {
  return (
    <details className="group" open>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filter
      </summary>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Price</p>
        <ul className="space-y-2 text-sm">
          {PRICE_RANGES.map((range) => {
            const active = activeMin === range.min && activeMax === range.max;
            return (
              <li key={range.label}>
                <Link
                  href={buildHref(
                    active ? { min_price: undefined, max_price: undefined } : { min_price: range.min, max_price: range.max },
                  )}
                  className={active ? "font-semibold text-navy" : "text-ink/70 hover:text-navy"}
                >
                  {range.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
