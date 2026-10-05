"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getCategory, getProducts } from "@/lib/api";
import CategoryDetail from "@/components/CategoryDetail";
import type { CategoryDetail as CategoryDetailType, ProductListResponse } from "@/lib/types";

// Same fallback pattern as /product and /pages: /category/[slug] statically generates a real page
// for every category known at build time, and public/.htaccess rewrites an unmatched
// /category/<slug> request (a category created after the last build) to this flat shell. It reads
// the real slug from the URL and fetches the category and its first page of products in the
// browser, so a new category works immediately -- just without the static SEO benefits until the
// next build.
function slugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== "category") return null;
  return segments[segments.length - 1];
}

export default function CategoryShellPage() {
  const pathname = usePathname();
  const slug = slugFromPathname(pathname);

  const [category, setCategory] = useState<CategoryDetailType | null>(null);
  const [products, setProducts] = useState<ProductListResponse | null>(null);
  // Lazy-initialized from `slug` rather than set inside the effect below,
  // so the no-slug case never needs a synchronous setState-in-effect.
  const [loading, setLoading] = useState(() => !!slug);
  const [notFound, setNotFound] = useState(() => !slug);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setNotFound(false);
    setCategory(null);
    setProducts(null);

    getCategory(slug)
      .then(async (fetched) => {
        const firstPage = await getProducts({ category: fetched.slug, page: 1, per_page: 24 }).catch(() => null);
        if (cancelled) return;
        setCategory(fetched);
        setProducts(firstPage);
        document.title = `${fetched.seo?.meta_title || fetched.name} | Anaiza Nest`;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">One moment, finding that category…</p>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">We couldn&apos;t find that category. Have a look at the shop instead.</p>
        <Link href="/shop" className="mt-4 inline-block text-body text-navy underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return <CategoryDetail category={category} initialProducts={products} />;
}
