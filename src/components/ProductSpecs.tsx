"use client";

import { useState } from "react";
import Link from "next/link";
import { detailRows, shownTags, SPEC_ROWS_SHOWN } from "@/lib/productDisplay";
import type { ProductAttributeValue, ProductSpec, ProductTag } from "@/lib/types";

// What the piece is made of, as a calm two-column list (the label small and in stone, the value in charcoal, a thin linen line
// between rows), then its tags as outlined chips. Eight rows show; "Show all" opens the rest (all of them are in the page's HTML
// either way). A row with nothing in it is not drawn. A tag opens the shop filtered to it.
export default function ProductSpecs({
  specifications,
  attributes = [],
  tags = [],
}: {
  specifications: ProductSpec[];
  attributes?: ProductAttributeValue[];
  tags?: ProductTag[];
}) {
  const rows = detailRows(specifications, attributes);
  const chips = shownTags(tags);
  const [all, setAll] = useState(false);

  if (rows.length === 0 && chips.length === 0) return null;

  const more = rows.length - SPEC_ROWS_SHOWN;

  return (
    <section className="mt-16 max-w-3xl">
      {rows.length > 0 && (
        <>
          <h2 className="mb-4 font-serif text-charcoal text-h2">Specifications</h2>
          <dl id="product-specs" className="border-b border-linen">
            {rows.map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                hidden={!all && index >= SPEC_ROWS_SHOWN}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 border-t border-linen py-3"
              >
                <dt className="text-caption text-stone">{row.label}</dt>
                <dd className="text-[0.9375rem] leading-6 text-charcoal">{row.value}</dd>
              </div>
            ))}
          </dl>
          {more > 0 && (
            <button
              type="button"
              onClick={() => setAll((open) => !open)}
              aria-expanded={all}
              aria-controls="product-specs"
              className="mt-2 flex min-h-11 items-center text-body font-medium text-navy underline"
            >
              {all ? "Show fewer" : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}

      {chips.length > 0 && (
        <ul aria-label="Tags" className={`flex flex-wrap gap-2 ${rows.length > 0 ? "mt-6" : ""}`}>
          {chips.map((tag) => (
            <li key={tag.id ?? tag.slug}>
              <Link
                href={`/shop?tag=${encodeURIComponent(tag.slug)}`}
                className="inline-flex min-h-9 items-center rounded-btn border border-linen px-3 text-card-tag text-navy transition-colors hover:border-gold"
              >
                {tag.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
