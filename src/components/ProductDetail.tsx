import Link from "next/link";
import { formatPrice } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";
import ProductCard from "@/components/ProductCard";
import Accordion from "@/components/Accordion";
import type { Product } from "@/lib/types";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper, so both render identical
// markup regardless of which one is currently supplying the data.
export default function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const onSale = product.discount_percent !== null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/shop?category=${product.category.slug}`} className="hover:text-navy">
          Gifts
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-xs text-muted">SKU: {product.sku}</p>
          <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            (4) · {product.stock_quantity > 0 ? "In stock" : "Out of stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-ink">
              {formatPrice(product.effective_price)}
            </span>
            {onSale && (
              <>
                <span className="text-lg text-muted line-through">{formatPrice(product.price)}</span>
                <span className="rounded bg-pill px-2 py-0.5 text-sm font-medium text-navy">
                  -{product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/80">
              {product.description}
            </p>
          )}

          <div className="mt-6">
            <AddToCartForm product={product} />
          </div>

          <div className="mt-8">
            <Accordion title="Product Details" defaultOpen>
              {product.description ?? "No additional details for this product yet."}
            </Accordion>
            <Accordion title="Delivery Info">
              Delivered nationwide via trusted courier partners — 1–3 business days
              inside Dhaka, 3–5 outside. Free delivery inside Dhaka on orders over
              ৳2,000. You can track any order from the Track Order page using your
              order ID and phone number.
            </Accordion>
            <Accordion title="Reviews (4)">
              Customer reviews for this product aren&rsquo;t live yet — check back
              soon.
            </Accordion>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-xl text-ink sm:text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
