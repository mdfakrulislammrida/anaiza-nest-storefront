"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ApiError, getArticle } from "@/lib/api";
import BlogDetail from "@/components/BlogDetail";
import type { Article } from "@/lib/types";

// /blog/[slug] statically generates a real page for every article known at
// build time. Unlike /product and /pages, /blog itself has to be a real
// listing page rather than free to double as the fallback shell, so this
// route exists purely as the fallback target: public/.htaccess rewrites an
// unmatched /blog/<slug> request (an article published after the last
// build) here. The URL bar still shows the real /blog/<slug> the visitor
// requested -- that's what we read via usePathname() (note it checks for
// "blog", not "article") -- and we fetch that slug from the API directly,
// no rebuild required, just without the static SEO benefits until the next
// one.
function slugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== "blog") return null;
  return segments[segments.length - 1];
}

export default function ArticleFallbackPage() {
  const pathname = usePathname();
  const slug = slugFromPathname(pathname);

  const [article, setArticle] = useState<Article | null>(null);
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
    setArticle(null);

    getArticle(slug)
      .then((fetched) => {
        if (cancelled) return;
        setArticle(fetched);
        document.title = fetched.seo?.meta_title || fetched.title;
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
        <p className="text-stone">One moment, finding that article…</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-stone">We couldn&apos;t find that article.</p>
        <Link href="/blog" className="mt-4 inline-block text-body text-navy underline">
          Back to blog
        </Link>
      </div>
    );
  }

  return <BlogDetail article={article} />;
}
