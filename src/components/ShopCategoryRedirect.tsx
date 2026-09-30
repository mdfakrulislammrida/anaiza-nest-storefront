"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// /shop?category=X used to be a dead link -- ProductListing never actually
// read the `category` query param, so it silently showed the unfiltered
// catalog. Now that categories have their own page, canonicalize that old
// link shape to it instead of resurrecting the broken filter. This is a
// client-side redirect (the only option in a static export -- there's no
// server to issue a real 3xx for a query-string variant of a static page).
export default function ShopCategoryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  useEffect(() => {
    if (category) {
      router.replace(`/category/${category}`);
    }
  }, [category, router]);

  return null;
}
