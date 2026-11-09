import Link from "next/link";

import { PRICE_RANGES } from "@/lib/priceRanges";

// The price filter as the column beside the list (from 640 px). On a phone the same ranges are in the Filter sheet (FilterSheet).
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
    // Collapsed by default, a single tap on "Filter" expands it.
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-caption font-semibold text-charcoal">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filter
      </summary>

      <div className="mt-4 space-y-4">
        <p className="text-caption font-semibold text-stone">Price</p>
        <ul className="space-y-2 text-body">
          {PRICE_RANGES.map((range) => {
            const active = activeMin === range.min && activeMax === range.max;
            return (
              <li key={range.label}>
                <Link
                  href={buildHref(
                    active ? { min_price: undefined, max_price: undefined } : { min_price: range.min, max_price: range.max },
                  )}
                  className={active ? "font-semibold text-navy" : "text-charcoal/70 hover:text-navy"}
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
