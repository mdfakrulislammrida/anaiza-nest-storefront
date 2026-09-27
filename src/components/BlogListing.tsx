"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getArticles } from "@/lib/api";
import ArticleCard from "./ArticleCard";
import type { ArticleListResponse } from "@/lib/types";

export default function BlogListing() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1") || 1;

  const [result, setResult] = useState<ArticleListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    getArticles({ page: currentPage, per_page: 12 })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const articles = result?.data ?? [];
  const meta = result?.meta;
  const showSkeleton = loading && !result;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div>
      <nav className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Blog</span>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {showSkeleton ? (
          <p className="py-20 text-center text-muted">Loading articles…</p>
        ) : articles.length > 0 ? (
          <div
            className={`grid grid-cols-1 gap-x-8 gap-y-12 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-muted">No articles published yet — check back soon.</p>
        )}

        {meta && meta.last_page > 1 && (
          <div className="mt-14 flex items-center justify-center gap-2">
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((page) => (
              <Link
                key={page}
                href={buildHref(page)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  page === meta.current_page ? "bg-navy text-white" : "text-ink/70 hover:bg-pill"
                }`}
              >
                {page}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
