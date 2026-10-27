"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/tracking";

// One `page_view` in the data layer for each page of a visit, the first one included, and one fbq PageView / ttq.page() for a page change
// in direct mode (the base snippets fire the first). Most navigation in this app is client-side (next/link), so without this only the
// first page a visitor lands on would ever register.
//
// Deliberately tracks pathname only, not search params: adding useSearchParams() here would require wrapping this (and everything
// under the root layout) in <Suspense>, for a case -- filter/sort changes on the same page -- that isn't really a new "page view"
// anyway.
//
// The event waits a moment so the page's title (changed by the router just after the path) is the new page's, and carries the address
// of the page the visitor came from (the previous page, or the referring site on the first one).
export default function RouteChangeTracker() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  const lastPath = useRef<string | null>(null);
  const previousHref = useRef("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // The same path twice (a repeated effect run) is one navigation.
    if (lastPath.current === pathname) return;

    const first = isFirst.current;
    isFirst.current = false;
    lastPath.current = pathname;

    // A navigation that comes before the last one has been reported replaces it. (No cleanup: a development double run must not drop the first page.)
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        trackPageView(first ? document.referrer : previousHref.current, first);
        previousHref.current = window.location.href;
      },
      first ? 0 : 80,
    );
  }, [pathname]);

  return null;
}
