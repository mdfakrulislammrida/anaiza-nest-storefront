"use client";

import { useEffect, useState } from "react";
import { getCategory } from "@/lib/api";
import CategoryDetail from "./CategoryDetail";
import type { CategoryDetail as CategoryDetailType, ProductListResponse } from "@/lib/types";

// Seeded from the statically-built category content, so first render is
// already correct -- no loading state. Silently refetches once on mount to
// pick up a content edit since the build; a failed refetch keeps what's
// rendered.
export default function CategoryDetailClient({
  initialCategory,
  initialProducts,
}: {
  initialCategory: CategoryDetailType;
  initialProducts: ProductListResponse | null;
}) {
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    let cancelled = false;

    getCategory(initialCategory.slug)
      .then((fresh) => {
        if (!cancelled) setCategory(fresh);
      })
      .catch(() => {
        // Static content already rendered is still correct enough to show.
      });

    return () => {
      cancelled = true;
    };
  }, [initialCategory.slug]);

  return <CategoryDetail category={category} initialProducts={initialProducts} />;
}
