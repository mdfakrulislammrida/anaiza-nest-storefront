import Link from "next/link";

import { PRICE_RANGES } from "@/lib/priceRanges";

export default function PriceFilterPanel({
  buildHref,
  activeMin,
  activeMax,
  bar = false,
}: {
  buildHref: (overrides: { min_price?: number; max_price?: number }) => string;
  activeMin?: number;
  activeMax?: number;
  // In the phone bar: the panel opens as a dropdown under the bar, over the list.
  bar?: boolean;
}) {
  return (
    // Collapsed by default: on mobile this panel sits above the product
    // grid at full width, and being force-open pushed every product below
    // the fold. A single tap on "Filter" expands it either way.
    <details className="group">
      <summary className={`flex cursor-pointer list-none items-center gap-1.5 text-caption font-semibold text-charcoal ${bar ? "min-h-11" : ""}`}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filter
      </summary>

      <div className={bar ? "absolute inset-x-0 top-full z-30 space-y-4 border-b border-linen bg-ivory px-4 py-4" : "mt-4 space-y-4"}>
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
