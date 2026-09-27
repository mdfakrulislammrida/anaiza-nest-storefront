"use client";

import { useEffect, useState } from "react";
import { getArticle } from "@/lib/api";
import BlogDetail from "./BlogDetail";
import type { Article } from "@/lib/types";

// Seeded from the statically-built article content, so first render is
// already correct -- no loading state. Silently refetches once on mount to
// pick up a content edit since the build; a failed refetch keeps what's
// rendered.
export default function BlogDetailClient({ initialArticle }: { initialArticle: Article }) {
  const [article, setArticle] = useState(initialArticle);

  useEffect(() => {
    let cancelled = false;

    getArticle(initialArticle.slug)
      .then((fresh) => {
        if (!cancelled) setArticle(fresh);
      })
      .catch(() => {
        // Static content already rendered is still correct enough to show.
      });

    return () => {
      cancelled = true;
    };
  }, [initialArticle.slug]);

  return <BlogDetail article={article} />;
}
