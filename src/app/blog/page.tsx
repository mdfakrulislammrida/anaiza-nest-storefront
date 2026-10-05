import type { Metadata } from "next";
import { Suspense } from "react";
import { getArticles } from "@/lib/api";
import BlogListing from "@/components/BlogListing";
import BlogListingFallback from "@/components/BlogListingFallback";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Blog",
  description: "Gift guides, care tips, and stories from Anaiza Nest.",
};

export default async function BlogPage() {
  // First page at build time (same query the client makes), so the article cards are in the static HTML.
  const initialResult = await getArticles({ page: 1, per_page: 12 }).catch(() => null);

  return (
    <div>
      <div className="border-b border-linen bg-linen">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-charcoal text-h1">Blog</h1>
          <p className="mt-2 text-body text-charcoal/70">
            Gift guides, care tips, and stories from Anaiza Nest.
          </p>
        </div>
      </div>

      <Suspense fallback={<BlogListingFallback result={initialResult} />}>
        <BlogListing initialResult={initialResult} />
      </Suspense>
    </div>
  );
}
