import type { Metadata } from "next";
import ProductListing, { type ListingSearchParams } from "@/components/ProductListing";

export const metadata: Metadata = {
  title: "Shop All Gifts",
  description: "Browse the full Anaiza Nest gift catalog — Bangladesh's #1 gift shop.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <div className="border-b border-line bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">All Gifts</h1>
          <p className="mt-2 text-sm text-muted">
            Browse the full Anaiza Nest gift catalog — Bangladesh&rsquo;s #1 gift shop.
          </p>
        </div>
      </div>

      <ProductListing searchParams={resolvedSearchParams} breadcrumbLabel="Shop" />
    </div>
  );
}
