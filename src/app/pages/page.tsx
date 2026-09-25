"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getPage } from "@/lib/api";
import type { Page } from "@/lib/types";

// Same single-shell pattern as /product: Apache rewrites any /pages/<slug>
// request to this one static file (see public/.htaccess), and we read the
// real slug from the URL client-side to fetch the matching CMS page.
function slugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== "pages") return null;
  return segments[segments.length - 1];
}

export default function CmsPage() {
  const pathname = usePathname();
  const slug = slugFromPathname(pathname);

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

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
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-muted">We couldn&apos;t find that page.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-navy underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{page.title}</h1>
      {page.content && (
        <div
          className="mt-8 space-y-4 text-sm leading-relaxed text-ink/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-ink [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  );
}
