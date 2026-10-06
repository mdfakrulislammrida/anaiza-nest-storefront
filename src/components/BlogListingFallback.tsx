import Link from "next/link";
import ArticleGrid from "./ArticleGrid";
import EmptyState from "./EmptyState";
import type { ArticleListResponse } from "@/lib/types";

// Suspense fallback around BlogListing -- see ProductListingFallback for why
// the fallback is the one place content can live in a statically built page.
export default function BlogListingFallback({ result }: { result: ArticleListResponse | null }) {
  if (!result) return <div className="py-20 text-center text-stone">One moment…</div>;

  return (
    <div>
      <nav className="mx-auto max-w-7xl px-4 py-4 text-caption text-stone sm:px-6">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">Blog</span>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {result.data.length > 0 ? (
          <ArticleGrid articles={result.data} />
        ) : (
          <EmptyState
            title="No articles yet"
            text="We have not published anything here yet. Please check back soon."
            linkHref="/shop"
            linkLabel="See the collection"
          />
        )}
      </div>
    </div>
  );
}
