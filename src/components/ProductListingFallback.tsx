import ListBreadcrumb from "./ListBreadcrumb";
import PhoneListBar from "./PhoneListBar";
import PriceFilterPanel from "./PriceFilterPanel";
import ProductGrid from "./ProductGrid";
import EmptyState from "./EmptyState";
import type { ProductListResponse } from "@/lib/types";
import { countOf } from "@/lib/cardTag";

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
  emptyTitle,
  emptyText,
  emptyLink,
  showBreadcrumb = true,
}: {
  result: ProductListResponse | null;
  breadcrumbLabel: string;
  showBreadcrumb?: boolean;
  basePath: string;
  emptyTitle?: string;
  emptyText?: string;
  emptyLink?: { href: string; label: string };
}) {
  // The build-time fetch failed: same placeholder as before this existed.
  if (!result) return <div className="py-20 text-center text-stone">One moment…</div>;

  // An empty list in the static HTML is an empty shelf (the static view never has filters).
  if (result.data.length === 0) {
    return (
      <div>
      {showBreadcrumb && <ListBreadcrumb label={breadcrumbLabel} />}
        <EmptyState title={emptyTitle} text={emptyText} linkHref={emptyLink?.href} linkLabel={emptyLink?.label} />
      </div>
    );
  }

  const buildHref = (overrides: { min_price?: number; max_price?: number }) => {
    const params = new URLSearchParams();
    if (overrides.min_price !== undefined) params.set("min_price", String(overrides.min_price));
    if (overrides.max_price !== undefined) params.set("max_price", String(overrides.max_price));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div>
      {showBreadcrumb && <ListBreadcrumb label={breadcrumbLabel} />}

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <PhoneListBar>
          <PriceFilterPanel buildHref={buildHref} bar />
        </PhoneListBar>
        <p className="my-4 text-body text-stone sm:hidden">{countOf(result.meta.total, "product")}</p>

        <div className="flex flex-col gap-8 sm:flex-row">
          <aside className="hidden shrink-0 sm:block sm:w-56">
            <PriceFilterPanel buildHref={buildHref} />
          </aside>

          <div className="flex-1">
            <div className="mb-6 hidden items-center justify-between sm:flex">
              <p className="text-body text-stone">{countOf(result.meta.total, "product")}</p>
            </div>

            <ProductGrid products={result.data} />
          </div>
        </div>
      </div>
    </div>
  );
}
