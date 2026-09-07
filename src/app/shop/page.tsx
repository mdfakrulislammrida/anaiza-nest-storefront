import Link from "next/link";
import { getCategories, getProducts } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

interface ShopSearchParams {
  category?: string;
  search?: string;
  page?: string;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const { category, search, page } = await searchParams;
  const currentPage = Number(page ?? "1") || 1;

  const [categories, productsRes] = await Promise.all([
    getCategories(),
    getProducts({ category, search, page: currentPage, per_page: 12 }),
  ]);

  const { data: products, meta } = productsRes;

  const buildHref = (overrides: Partial<ShopSearchParams>) => {
    const params = new URLSearchParams();
    const next = { category, search, page: undefined, ...overrides };
    if (next.category) params.set("category", next.category);
    if (next.search) params.set("search", next.search);
    if (next.page) params.set("page", String(next.page));
    const qs = params.toString();
    return `/shop${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Collection
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Shop</h1>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <aside className="flex shrink-0 flex-col gap-6 sm:w-56">
          <form action="/shop" className="flex gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search products"
              className="w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
            />
          </form>

          <nav className="flex flex-col gap-1">
            <Link
              href={buildHref({ category: undefined })}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                !category
                  ? "bg-ink text-ivory"
                  : "text-ink/70 hover:bg-ink/5"
              }`}
            >
              All categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={buildHref({ category: c.slug })}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  category === c.slug
                    ? "bg-ink text-ivory"
                    : "text-ink/70 hover:bg-ink/5"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          {search && (
            <p className="mb-6 text-sm text-ink/60">
              Showing results for <span className="font-semibold">&ldquo;{search}&rdquo;</span>
            </p>
          )}

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-ink/60">
              No products match these filters.
            </p>
          )}

          {meta.last_page > 1 && (
            <div className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildHref({ page: String(p) })}
                  className={`flex h-9 w-9 items-center justify-center text-sm font-medium transition-colors ${
                    p === meta.current_page
                      ? "bg-ink text-ivory"
                      : "text-ink/70 hover:bg-ink/5"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
