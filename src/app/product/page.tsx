"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getProduct, getProducts } from "@/lib/api";
import { trackViewItem } from "@/lib/tracking";
import ProductDetail from "@/components/ProductDetail";
import type { Product } from "@/lib/types";

// /product/[slug] statically generates a real page for every product known
// at build time. This flat route is the fallback for a slug that ISN'T in
// that list yet (a product added after the last build): public/.htaccess
// rewrites an unmatched /product/<slug> request here, keeping the browser's
// URL bar showing the real slug, which we read via usePathname() and use to
// fetch the product from the API client-side -- no rebuild required, just
// without the static SEO benefits until the next one.
function slugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== "product") return null;
  return segments[segments.length - 1];
}

export default function ProductPage() {
  const pathname = usePathname();
  const slug = slugFromPathname(pathname);

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
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
    setProduct(null);
    setRelated([]);

    getProduct(slug)
      .then(async (fetched) => {
        if (cancelled) return;
        setProduct(fetched);
        document.title = fetched.seo?.meta_title || fetched.name;
        trackViewItem(fetched);

        const relatedRes = await getProducts({ category: fetched.category.slug, per_page: 5 }).catch(
          () => null,
        );
        if (!cancelled && relatedRes) {
          setRelated(relatedRes.data.filter((p) => p.id !== fetched.id).slice(0, 4));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        }
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
        <p className="text-stone">One moment, finding that piece…</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">We couldn&apos;t find that piece. Have a look at the shop for something similar.</p>
        <Link href="/shop" className="mt-4 inline-block text-body text-navy underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return <ProductDetail product={product} related={related} />;
}
