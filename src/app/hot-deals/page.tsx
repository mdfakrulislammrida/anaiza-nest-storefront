import type { Metadata } from "next";
import ProductListing, { type ListingSearchParams } from "@/components/ProductListing";
import CountdownTimer from "@/components/CountdownTimer";

export const metadata: Metadata = {
  title: "Hot Deals",
  description: "Limited-time prices on Anaiza Nest gifts, while stock lasts.",
};

export default async function HotDealsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <div className="relative flex min-h-[220px] flex-col justify-end bg-gradient-to-br from-gray-500 to-black p-8 text-white sm:p-12">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-3xl sm:text-4xl">
              🔥 Hot Deals
            </h1>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2">
            <CountdownTimer />
          </div>
        </div>
      </div>

      <ProductListing
        searchParams={resolvedSearchParams}
        fixedParams={{ on_sale: true }}
        breadcrumbLabel="Hot Deals"
      />
    </div>
  );
}
