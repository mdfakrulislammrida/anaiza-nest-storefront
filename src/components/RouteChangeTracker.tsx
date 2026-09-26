"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/tracking";

// Meta Pixel's and TikTok Pixel's base install snippets only fire PageView
// once, on initial script load. Most navigation in this app is client-side
// (next/link), so without this, only the very first page a visitor lands on
// would ever register a PageView.
//
// Deliberately tracks pathname only, not search params: adding
// useSearchParams() here would require wrapping this (and everything under
// the root layout) in <Suspense>, for a case -- filter/sort changes on the
// same page -- that isn't really a new "page view" anyway.
export default function RouteChangeTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // The base snippets already fired PageView once for this load.
      isFirstRender.current = false;
      return;
    }
    trackPageView();
  }, [pathname]);

  return null;
}
