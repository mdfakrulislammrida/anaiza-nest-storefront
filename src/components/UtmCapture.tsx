"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureUtmParams } from "@/lib/attribution";

// Reads window.location.search directly rather than useSearchParams() --
// same reasoning as RouteChangeTracker: that hook would require wrapping
// the whole app in <Suspense> just for this. Runs on mount and on every
// route change, so a deep link with UTM params landing anywhere (not just
// the homepage) still gets captured.
export default function UtmCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureUtmParams(window.location.search);
  }, [pathname]);

  return null;
}
