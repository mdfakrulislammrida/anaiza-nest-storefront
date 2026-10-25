import Link from "next/link";
import { PRICE_RANGES, priceRangeHref } from "@/lib/priceRanges";

// "Gift by budget": four quiet tiles, each opening the shop already filtered to that price range (the same ranges the
// Filter panel offers, so the panel shows the range as chosen).
export default function GiftByBudget() {
  return (
    <section aria-labelledby="gift-by-budget" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
      <h2 id="gift-by-budget" className="mb-6 font-serif text-charcoal text-h2">
        Gift by budget
      </h2>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PRICE_RANGES.map((range) => (
          <li key={range.tile}>
            <Link
              href={priceRangeHref(range)}
              className="flex min-h-24 items-end border border-linen bg-linen p-4 font-serif text-body text-charcoal transition-colors duration-200 ease-out hover:border-gold"
            >
              {range.tile}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
