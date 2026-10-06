import type { Metadata } from "next";
import Link from "next/link";
import { CTA } from "@/lib/brand";

// Also the page the static export writes as 404.html, and what the placeholder routes render.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-h1">We couldn&apos;t find that page</h1>
      <p className="mt-4 text-body text-stone">
        The link may have changed, or it may have been typed a little differently. The collection is a good place to
        start again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/shop"
          className="rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          {CTA.shopTeaSets}
        </Link>
        <Link
          href="/gift-finder"
          className="rounded-btn border border-stone/80 px-8 py-4 text-button text-charcoal transition-colors hover:bg-linen"
        >
          {CTA.findGift}
        </Link>
      </div>
    </div>
  );
}
