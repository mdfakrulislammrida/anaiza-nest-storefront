import type { Metadata } from "next";
import { Suspense } from "react";
import BlogListing from "@/components/BlogListing";

export const metadata: Metadata = {
  title: "Blog",
  description: "Gift guides, care tips, and stories from Anaiza Nest — Bangladesh's #1 gift shop.",
};

export default function BlogPage() {
  return (
    <div>
      <div className="border-b border-line bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">Blog</h1>
          <p className="mt-2 text-sm text-muted">
            Gift guides, care tips, and stories from Anaiza Nest.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="py-20 text-center text-muted">Loading…</div>}>
        <BlogListing />
      </Suspense>
    </div>
  );
}
