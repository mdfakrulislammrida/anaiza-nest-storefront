"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getPage } from "@/lib/api";
import type { Page } from "@/lib/types";
import { RICH_TABLE_CLASSES, wrapTables } from "@/lib/richHtml";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">{page.title}</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">{page.title}</h1>
      {page.content && (
        <div
          className={`mt-8 space-y-4 text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-h2 [&_h2]:text-charcoal [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-h2 [&_h3]:text-charcoal [&_li]:ml-6 [&_ol]:list-decimal [&_strong]:text-charcoal [&_ul]:list-disc ${RICH_TABLE_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: wrapTables(page.content) }}
        />
      )}
    </div>
  );
}
