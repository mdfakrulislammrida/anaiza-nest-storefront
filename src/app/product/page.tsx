"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getProduct, getProducts } from "@/lib/api";
import { trackViewItem } from "@/lib/tracking";
import { formatPrice } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";
import ProductCard from "@/components/ProductCard";
import Accordion from "@/components/Accordion";
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
        <p className="text-muted">Loading product…</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-muted">We couldn&apos;t find that product.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm text-navy underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const onSale = product.discount_percent !== null;

  return (
    // Extra bottom padding on mobile clears the fixed Add to Cart / Buy Now
    // bar (see AddToCartForm) so it doesn't cover the last section of
    // content; not needed at sm and up, where those buttons are in-flow.
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-32 sm:px-6 sm:pb-10">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/shop?category=${product.category.slug}`} className="hover:text-navy">
          Gifts
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-xs text-muted">SKU: {product.sku}</p>
          <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            (4) · {product.stock_quantity > 0 ? "In stock" : "Out of stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-ink">
              {formatPrice(product.effective_price)}
            </span>
            {onSale && (
              <>
                <span className="text-lg text-muted line-through">{formatPrice(product.price)}</span>
                <span className="rounded bg-pill px-2 py-0.5 text-sm font-medium text-navy">
                  -{product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/80">
              {product.description}
            </p>
          )}

          <div className="mt-6">
            <AddToCartForm product={product} />
          </div>

          <div className="mt-8">
            <Accordion title="Product Details" defaultOpen>
              {product.description ?? "No additional details for this product yet."}
            </Accordion>
            <Accordion title="Delivery Info">
              Delivered nationwide via trusted courier partners — 1–3 business days
              inside Dhaka, 3–5 outside. Free delivery inside Dhaka on orders over
              ৳2,000. You can track any order from the Track Order page using your
              order ID and phone number.
            </Accordion>
            <Accordion title="Reviews (4)">
              Customer reviews for this product aren&rsquo;t live yet — check back
              soon.
            </Accordion>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-xl text-ink sm:text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
