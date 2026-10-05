import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import CountdownTimer from "./CountdownTimer";

// The "Special prices" section (the section type key stays hot_deals, and so does the /hot-deals URL).
export default function HotDealsSection({
  products,
  title = "Special prices",
  subtitle = "Selected pieces at lower prices.",
  endsAt,
}: {
  products: Product[];
  title?: string;
  subtitle?: string;
  // The admin's "Deal ends at"; the countdown shows only when it is set and still in the future.
  endsAt?: string | null;
}) {
  if (products.length === 0) return null;

  return (
    <section className="bg-deepink text-ivory">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-h2">{title}</h2>
            <p className="mt-1 text-body text-ivory/80">{subtitle}</p>
          </div>
          <CountdownTimer endsAt={endsAt} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} theme="dark" />
          ))}
        </div>
      </div>
    </section>
  );
}
