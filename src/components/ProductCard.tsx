"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
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
  const image = product.images?.[0]?.url ?? null;
  const onSale = product.discount_percent !== null;
  const wishlisted = isWishlisted(product.id);
  const dark = theme === "dark";

  return (
    <div className="group relative">
      {/* Plain <a>, not next/link: /product/<slug> is served by a single
          static shell (see src/app/product/page.tsx) that only resolves
          correctly on a real browser navigation, not a client-side one. */}
      <a href={`/product/${product.slug}`} className="block">
        <div className={`relative aspect-square overflow-hidden ${dark ? "bg-white/10" : "bg-pill"}`}>
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
                dark ? "from-white/10 to-white/5" : "from-cream to-pill"
              }`}
            >
              <span className={`font-serif text-lg ${dark ? "text-white/20" : "text-ink/20"}`}>
                Anaiza Nest
              </span>
            </div>
          )}

          {onSale ? (
            <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Hot Deal
            </span>
          ) : product.is_new ? (
            <span className="absolute left-3 top-3 rounded-full bg-navy px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              New
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className={`line-clamp-2 text-sm font-medium ${dark ? "text-white" : "text-ink"}`}>
            {product.name}
          </h3>
          <p className={`text-xs ${dark ? "text-white/50" : "text-muted"}`}>(4)</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-base font-semibold ${dark ? "text-white" : "text-ink"}`}>
              {formatPrice(product.effective_price)}
            </span>
            {onSale && (
              <>
                <span className={`text-sm line-through ${dark ? "text-white/50" : "text-muted"}`}>
                  {formatPrice(product.price)}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    dark ? "bg-white/10 text-white" : "bg-pill text-navy"
                  }`}
                >
                  -{product.discount_percent}%
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
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:text-red-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-4 w-4 ${wishlisted ? "text-red-600" : ""}`}
        >
          <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3 2.5-2 4-3 6-3 3.6 0 5.5 3.4 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => addItem(product, null, 1)}
        disabled={product.stock_quantity <= 0}
        className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Add to cart"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
      </button>
    </div>
  );
}
