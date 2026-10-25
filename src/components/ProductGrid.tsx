import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

// The card grid, shared by the client ProductListing and by the static
// fallback that puts the first page into the HTML -- one markup, so the swap
// between them doesn't move anything.
export default function ProductGrid({
  products,
  dimmed = false,
}: {
  products: Product[];
  dimmed?: boolean;
}) {
  return (
    <>
      {/* The cards' names are h3s: this keeps the page's headings in order (h1, h2, h3) where the list follows the title directly. */}
      <h2 className="sr-only">Products</h2>
      <div
        className={`grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${
          dimmed ? "opacity-60" : "opacity-100"
        }`}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
