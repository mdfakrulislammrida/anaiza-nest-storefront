import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageSections, getProducts } from "@/lib/api";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import HotDealsCountdown from "@/components/HotDealsCountdown";

export const metadata: Metadata = {
  alternates: { canonical: "/hot-deals" },
  title: "Special prices",
  description: "Selected Anaiza Nest pieces at lower prices.",
};

export default async function HotDealsPage() {
  // First page at build time (same query the client makes), so the cards are in the static HTML.
  const initialResult = await getProducts({ on_sale: true, page: 1, per_page: 24 }).catch(() => null);
  // The countdown shows only when the admin has set a real "Deal ends at" on the Special prices section.
  const sections = await getHomepageSections().catch(() => []);
  const dealEndsAt = sections.find((section) => section.type === "hot_deals")?.deal_ends_at ?? null;

  return (
    <div>
      <div className="relative flex min-h-[14rem] flex-col justify-end bg-deepink p-8 text-ivory sm:p-16">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-h1">Special prices</h1>
            <p className="mt-2 text-body text-ivory/80">Selected pieces at lower prices.</p>
          </div>
          <HotDealsCountdown initialEndsAt={dealEndsAt} className="rounded-btn bg-ivory/10 px-4 py-2" />
        </div>
      </div>

      <Suspense
        fallback={
          <ProductListingFallback result={initialResult} breadcrumbLabel="Special prices"
            basePath="/hot-deals"
            emptyTitle="No special prices right now"
            emptyText="Nothing is marked down at the moment. Have a look at the full collection, or check back soon."
            emptyLink={{ href: "/shop", label: "See all gifts" }}
          />
        }
      >
        <ProductListing
          fixedParams={{ on_sale: true }}
          breadcrumbLabel="Special prices"
          initialResult={initialResult}
          emptyTitle="No special prices right now"
          emptyText="Nothing is marked down at the moment. Have a look at the full collection, or check back soon."
          emptyLink={{ href: "/shop", label: "See all gifts" }}
        />
      </Suspense>
    </div>
  );
}
