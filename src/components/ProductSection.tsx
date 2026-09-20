import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductSection({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
