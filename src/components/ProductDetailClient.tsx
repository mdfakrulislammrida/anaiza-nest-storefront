"use client";

import { useEffect, useState } from "react";
import { getProduct, getProducts } from "@/lib/api";
import { trackViewItem } from "@/lib/tracking";
import ProductDetail from "./ProductDetail";
import type { Product } from "@/lib/types";

// Seeded from the statically-built product/related data, so first render is
// already the real page -- no loading state. On mount we silently refetch
// once to pick up a price/stock/content change since the build; a failed
// refetch (or the product no longer existing) just keeps what's rendered.
export default function ProductDetailClient({
  initialProduct,
  initialRelated,
}: {
  initialProduct: Product;
  initialRelated: Product[];
}) {
  const [product, setProduct] = useState(initialProduct);
  const [related, setRelated] = useState(initialRelated);

  useEffect(() => {
    trackViewItem(initialProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once for the product this page loaded with, not again after the background refresh below
  }, [initialProduct.slug]);

  useEffect(() => {
    let cancelled = false;

    getProduct(initialProduct.slug)
      .then(async (fresh) => {
        if (cancelled) return;
        setProduct(fresh);

        const relatedRes = await getProducts({ category: fresh.category.slug, per_page: 5 }).catch(
          () => null,
        );
        if (!cancelled && relatedRes) {
          setRelated(relatedRes.data.filter((p) => p.id !== fresh.id).slice(0, 4));
        }
      })
      .catch(() => {
        // Static content already rendered is still correct enough to show.
      });

    return () => {
      cancelled = true;
    };
  }, [initialProduct.slug]);

  return <ProductDetail product={product} related={related} />;
}
