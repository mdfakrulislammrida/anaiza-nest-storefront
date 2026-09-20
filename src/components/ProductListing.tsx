import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import PriceFilterPanel from "./PriceFilterPanel";
import SortDropdown from "./SortDropdown";
import type { ProductListParams, ProductSort } from "@/lib/types";

export interface ListingSearchParams {
  search?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  page?: string;
}

const VALID_SORTS: ProductSort[] = ["newest", "price_asc", "price_desc"];

export default async function ProductListing({
  searchParams,
  fixedParams,
  breadcrumbLabel,
}: {
  searchParams: ListingSearchParams;
  fixedParams?: Partial<ProductListParams>;
  breadcrumbLabel: string;
}) {
  const currentPage = Number(searchParams.page ?? "1") || 1;
  const minPrice = searchParams.min_price ? Number(searchParams.min_price) : undefined;
  const maxPrice = searchParams.max_price ? Number(searchParams.max_price) : undefined;
  const sort = VALID_SORTS.includes(searchParams.sort as ProductSort)
    ? (searchParams.sort as ProductSort)
    : undefined;

  const { data: products, meta } = await getProducts({
    ...fixedParams,
    search: searchParams.search,
    min_price: minPrice,
    max_price: maxPrice,
    sort,
    page: currentPage,
    per_page: 24,
  });

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const next: Record<string, string | number | undefined> = {
      search: searchParams.search,
      min_price: minPrice,
      max_price: maxPrice,
      sort: searchParams.sort,
      page: undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div>
      <nav className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{breadcrumbLabel}</span>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row">
          <aside className="shrink-0 sm:w-56">
            <PriceFilterPanel buildHref={buildHref} activeMin={minPrice} activeMax={maxPrice} />
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted">{meta.total} products</p>
              <SortDropdown />
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="py-20 text-center text-muted">No products match these filters.</p>
            )}

            {meta.last_page > 1 && (
              <div className="mt-14 flex items-center justify-center gap-2">
                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={buildHref({ page })}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      page === meta.current_page ? "bg-navy text-white" : "text-ink/70 hover:bg-pill"
                    }`}
                  >
                    {page}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
