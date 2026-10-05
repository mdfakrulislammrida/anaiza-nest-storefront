import type { Metadata } from "next";
import { Suspense } from "react";
import { getHomepageSections, getProducts } from "@/lib/api";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import HotDealsCountdown from "@/components/HotDealsCountdown";

export const metadata: Metadata = {
  alternates: { canonical: "/hot-deals" },
  title: "Hot Deals",
  description: "Reduced prices on Anaiza Nest gifts, while stock lasts.",
};

export default async function HotDealsPage() {
  // First page at build time (same query the client makes), so the cards are in the static HTML.
  const initialResult = await getProducts({ on_sale: true, page: 1, per_page: 24 }).catch(() => null);
  // The countdown shows only when the admin has set a real "Deal ends at" on the Hot Deals section.
  const sections = await getHomepageSections().catch(() => []);
  const dealEndsAt = sections.find((section) => section.type === "hot_deals")?.deal_ends_at ?? null;

  return (
    <div>
      <div className="relative flex min-h-[220px] flex-col justify-end bg-gradient-to-br from-gray-500 to-black p-8 text-white sm:p-12">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-3xl sm:text-4xl">
              🔥 Hot Deals
            </h1>
          </div>
          <HotDealsCountdown initialEndsAt={dealEndsAt} className="rounded-full bg-white/10 px-4 py-2" />
        </div>
      </div>

      <Suspense
        fallback={
          <ProductListingFallback result={initialResult} breadcrumbLabel="Hot Deals" basePath="/hot-deals" />
        }
      >
        <ProductListing
          fixedParams={{ on_sale: true }}
          breadcrumbLabel="Hot Deals"
          initialResult={initialResult}
        />
      </Suspense>
    </div>
  );
}
