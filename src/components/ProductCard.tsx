"use client";

import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import ResponsiveImage from "@/components/ResponsiveImage";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function ProductCard({
  product,
  theme = "light",
}: {
  product: Product;
  theme?: "light" | "dark";
}) {
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const image = product.images?.[0] ?? null;
  const onSale = product.discount_percent !== null;
  const wishlisted = isWishlisted(product.id);
  const dark = theme === "dark";

  return (
    <div className="group relative">
      {/* Plain <a>, not next/link: /product/<slug> is served by a single
          static shell (see src/app/product/page.tsx) that only resolves
          correctly on a real browser navigation, not a client-side one. */}
      <a href={`/product/${product.slug}`} className="block">
        {/* The product photograph is the one thing that carries a soft, warm shadow; the card does not. */}
        <div className={`relative aspect-square overflow-hidden shadow-warm ${dark ? "bg-ivory/10" : "bg-linen"}`}>
          {image ? (
            <ResponsiveImage
              image={image}
              alt={product.name}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <span className={`font-serif text-body ${dark ? "text-ivory/70" : "text-charcoal/70"}`}>Anaiza Nest</span>
            </div>
          )}

          {/* Quiet labels in palette colours: no fills that shout. */}
          {onSale ? (
            <span className="absolute left-2 top-2 rounded-btn bg-ivory/90 px-2 py-1 text-caption font-medium text-navy">
              Special price
            </span>
          ) : product.is_new ? (
            <span className="absolute left-2 top-2 rounded-btn bg-ivory/90 px-2 py-1 text-caption font-medium text-navy">
              New
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-1">
          <h3 className={`line-clamp-2 text-body font-medium ${dark ? "text-ivory" : "text-charcoal"}`}>
            {product.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-body font-semibold ${dark ? "text-ivory" : "text-charcoal"}`}>
              {formatPrice(product.effective_price)}
            </span>
            {onSale && (
              <>
                <span className={`text-body line-through ${dark ? "text-ivory/70" : "text-stone"}`}>
                  {formatPrice(product.price)}
                </span>
                <span className={`text-caption ${dark ? "text-champagne" : "text-navy"}`}>
                  Save {product.discount_percent}%
                </span>
              </>
            )}
          </div>
        </div>
      </a>

      <button
        type="button"
        onClick={() => toggle(product)}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 text-navy transition-colors hover:text-gold"
      >
        <svg
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4"
        >
          <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3 2.5-2 4-3 6-3 3.6 0 5.5 3.4 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => addItem(product, null, 1)}
        disabled={product.stock_quantity <= 0}
        className={`absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${dark ? "bg-ivory text-navy" : "bg-navy text-ivory"}`}
        aria-label="Add to cart"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
      </button>
    </div>
  );
}
