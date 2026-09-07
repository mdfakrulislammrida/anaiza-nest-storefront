import Link from "next/link";
import { getCategories, getProducts } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { Category, Product } from "@/lib/types";

export default async function Home() {
  let categories: Category[] = [];
  let featured: Product[] = [];
  let apiUnreachable = false;

  try {
    const [categoriesRes, newRes] = await Promise.all([
      getCategories(),
      getProducts({ is_new: true, per_page: 8 }),
    ]);
    categories = categoriesRes;
    featured = newRes.data;

    if (featured.length === 0) {
      featured = (await getProducts({ per_page: 8 })).data;
    }
  } catch {
    apiUnreachable = true;
  }

  return (
    <div>
      <section className="border-b border-ink/10 bg-ivory">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24 sm:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            The current collection
          </p>
          <h1 className="max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-6xl">
            Considered pieces, quietly made.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-ink/70">
            Anaiza is a small studio making ceramics and gifting sets meant to
            outlast trends — sourced with care, finished by hand.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
          >
            Shop the collection
          </Link>
        </div>
      </section>

      {apiUnreachable ? (
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-ink/60">
            We couldn&apos;t reach the catalog right now. Please make sure the
            Anaiza API is running and refresh.
          </p>
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/shop?category=${category.slug}`}
                    className="border border-ink/15 px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-gold hover:text-gold"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mx-auto max-w-6xl px-6 pb-24">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-2xl text-ink sm:text-3xl">
                New &amp; noteworthy
              </h2>
              <Link
                href="/shop"
                className="text-sm font-medium text-gold transition-colors hover:text-burgundy"
              >
                View all &rarr;
              </Link>
            </div>

            {featured.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="text-ink/60">No products available yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
