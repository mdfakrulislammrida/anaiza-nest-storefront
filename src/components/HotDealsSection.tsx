import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import CountdownTimer from "./CountdownTimer";

export default function HotDealsSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl sm:text-3xl">
              🔥 Hot Deals
            </h2>
            <p className="mt-1 text-sm text-white/70">Limited-time prices, while stock lasts.</p>
          </div>
          <CountdownTimer />
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} theme="dark" />
          ))}
        </div>
      </div>
    </section>
  );
}
