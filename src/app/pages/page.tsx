"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getPage } from "@/lib/api";
import type { Page } from "@/lib/types";
import CmsPageContent from "@/components/CmsPageContent";

// Same fallback pattern as /product: /pages/[slug] statically generates a
// real page for every CMS page known at build time, and public/.htaccess
// rewrites an unmatched /pages/<slug> request (one added after the last
// build) to this flat shell, which reads the real slug from the URL
// client-side and fetches the matching CMS page directly.
function slugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== "pages") return null;
  return segments[segments.length - 1];
}

export default function CmsPage() {
  const pathname = usePathname();
  const slug = slugFromPathname(pathname);

  const [page, setPage] = useState<Page | null>(null);
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
    setPage(null);

    getPage(slug)
      .then((fetched) => {
        if (cancelled) return;
        setPage(fetched);
        document.title = fetched.title;
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
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">One moment…</p>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">We couldn&apos;t find that page.</p>
        <Link href="/" className="mt-4 inline-block text-body text-navy underline">
          Back to home
        </Link>
      </div>
    );
  }

  return <CmsPageContent page={page} />;
}
