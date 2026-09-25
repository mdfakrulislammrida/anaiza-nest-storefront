"use client";

import { useEffect, useState } from "react";
import { getPage } from "@/lib/api";
import CmsPageContent from "./CmsPageContent";
import type { Page } from "@/lib/types";

// Seeded from the statically-built page content, so first render is already
// correct -- no loading state. Silently refetches once on mount to pick up
// a content edit since the build; a failed refetch keeps what's rendered.
export default function CmsPageClient({ initialPage }: { initialPage: Page }) {
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    let cancelled = false;

    getPage(initialPage.slug)
      .then((fresh) => {
        if (!cancelled) setPage(fresh);
      })
      .catch(() => {
        // Static content already rendered is still correct enough to show.
      });

    return () => {
      cancelled = true;
    };
  }, [initialPage.slug]);

  return <CmsPageContent page={page} />;
}
