import type { Metadata } from "next";
import { Suspense } from "react";
import { getProducts } from "@/lib/api";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import ShopCategoryRedirect from "@/components/ShopCategoryRedirect";

export const metadata: Metadata = {
  alternates: { canonical: "/shop" },
  title: "Shop All Gifts",
  description: "Browse the full Anaiza Nest gift catalog.",
};

export default async function ShopPage() {
  // First page at build time (same query the client makes), so the cards are in the static HTML.
  const initialResult = await getProducts({ page: 1, per_page: 24 }).catch(() => null);

  return (
    <div>
      <div className="border-b border-line bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">All Gifts</h1>
          <p className="mt-2 text-sm text-muted">
            Browse the full Anaiza Nest gift catalog.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <ProductListingFallback result={initialResult} breadcrumbLabel="Shop" basePath="/shop" />
        }
      >
        <ShopCategoryRedirect />
        <ProductListing breadcrumbLabel="Shop" initialResult={initialResult} />
      </Suspense>
    </div>
  );
}
