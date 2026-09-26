"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getProducts } from "@/lib/api";
import { trackViewItemList } from "@/lib/tracking";
import ProductCard from "./ProductCard";
import PriceFilterPanel from "./PriceFilterPanel";
import SortDropdown from "./SortDropdown";
import type { ProductListParams, ProductListResponse, ProductSort } from "@/lib/types";

const VALID_SORTS: ProductSort[] = ["newest", "price_asc", "price_desc"];

export default function ProductListing({
  fixedParams,
  breadcrumbLabel,
}: {
  fixedParams?: Partial<ProductListParams>;
  breadcrumbLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // fixedParams is a fresh object literal from the caller on every render
  // (e.g. {on_sale: true}), but its actual content never changes for a
  // given page — freeze it at first render so it's a stable effect input.
  const fixedParamsRef = useRef(fixedParams);

  const search = searchParams.get("search") ?? undefined;
  const minPrice = searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined;
  const maxPrice = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined;
  const sortParam = searchParams.get("sort");
  const sort = VALID_SORTS.includes(sortParam as ProductSort) ? (sortParam as ProductSort) : undefined;
  const currentPage = Number(searchParams.get("page") ?? "1") || 1;

  const [result, setResult] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Flip the loading flag before kicking off the fetch below — standard
    // "start of an async effect" pattern, not a case the lint rule's
    // cascading-render concern actually applies to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    getProducts({
      ...fixedParamsRef.current,
      search,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
      page: currentPage,
      per_page: 24,
    })
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          trackViewItemList(res.data, breadcrumbLabel);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, minPrice, maxPrice, sort, currentPage, breadcrumbLabel]);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const next: Record<string, string | number | undefined> = {
      search,
      min_price: minPrice,
      max_price: maxPrice,
      sort: sortParam ?? undefined,
      page: undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const products = result?.data ?? [];
  const meta = result?.meta;
  const showSkeleton = loading && !result;

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
              <p className="text-sm text-muted">
                {showSkeleton ? "Loading…" : `${meta?.total ?? 0} products`}
              </p>
              <SortDropdown />
            </div>

            {showSkeleton ? (
              <p className="py-20 text-center text-muted">Loading products…</p>
            ) : products.length > 0 ? (
              <div
                className={`grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${
                  loading ? "opacity-60" : "opacity-100"
                }`}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="py-20 text-center text-muted">No products match these filters.</p>
            )}

            {meta && meta.last_page > 1 && (
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
