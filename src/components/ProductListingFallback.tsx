import Link from "next/link";
import PriceFilterPanel from "./PriceFilterPanel";
import ProductGrid from "./ProductGrid";
import type { ProductListResponse } from "@/lib/types";

// Rendered as the <Suspense fallback> around ProductListing. ProductListing
// reads useSearchParams(), which makes a statically built page skip rendering
// that whole boundary and emit only the fallback -- so the fallback is the
// only place content can live if it's to be in the HTML crawlers (and
// no-JS visitors) get. It mirrors ProductListing's layout so the real thing
// replaces it without shifting; the sort control is left out because it needs
// the URL, and shows up once JS runs.
export default function ProductListingFallback({
  result,
  breadcrumbLabel,
  basePath,
}: {
  result: ProductListResponse | null;
  breadcrumbLabel: string;
  basePath: string;
}) {
  // The build-time fetch failed: same placeholder as before this existed.
  if (!result) return <div className="py-20 text-center text-stone">One moment…</div>;

  const buildHref = (overrides: { min_price?: number; max_price?: number }) => {
    const params = new URLSearchParams();
    if (overrides.min_price !== undefined) params.set("min_price", String(overrides.min_price));
    if (overrides.max_price !== undefined) params.set("max_price", String(overrides.max_price));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div>
      <nav className="mx-auto max-w-7xl px-4 py-4 text-caption text-stone sm:px-6">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">{breadcrumbLabel}</span>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row">
          <aside className="shrink-0 sm:w-56">
            <PriceFilterPanel buildHref={buildHref} />
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-body text-stone">{result.meta.total} products</p>
            </div>

            {result.data.length > 0 ? (
              <ProductGrid products={result.data} />
            ) : (
              <p className="py-20 text-center text-stone">Nothing matches those filters yet. Try loosening them, or let the Gift finder help you find the right gift.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
