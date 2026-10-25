"use client";

import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import ResponsiveImage from "@/components/ResponsiveImage";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { priceView } from "@/lib/pricing";
import { cardTag, isLowStock, isSoldOut } from "@/lib/cardTag";
import RatingSummary from "@/components/RatingSummary";

// The one tag on the photo, top left. Palette colours only: a real sale is ivory with a burgundy outline, a sold-out piece,
// a label and "New" are linen with navy text.
const TAG_CLASS: Record<string, string> = {
  sale: "border border-burgundy bg-ivory text-burgundy",
  "sold-out": "bg-linen text-navy",
  label: "bg-linen text-navy",
  new: "bg-linen text-navy",
};

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
  // From the regular and the sale price alone: a sale price of 0 (or one not below the price) is no sale.
  const price = priceView(product.price, product.sale_price);
  const soldOut = isSoldOut(product.stock_quantity);
  const tag = cardTag(product, price.onSale);
  const wishlisted = isWishlisted(product.id);
  const dark = theme === "dark";

  // 40 px squares, a 1 px border, a thin navy line icon (ivory on a dark section).
  const squareButton = `flex h-10 w-10 shrink-0 items-center justify-center rounded-btn border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    dark ? "border-ivory/40 text-ivory hover:border-champagne" : "border-linen bg-ivory text-navy hover:bg-linen"
  }`;

  return (
    <div className="group relative flex h-full flex-col">
      {/* Plain <a>, not next/link: /product/<slug> is served by a single
          static shell (see src/app/product/page.tsx) that only resolves
          correctly on a real browser navigation, not a client-side one. */}
      <a href={`/product/${product.slug}`} className="block" aria-hidden="true" tabIndex={-1}>
        {/* A photograph: 4:5, no corners, no shadow, whatever ratio was uploaded. */}
        <div className={`relative aspect-[4/5] overflow-hidden ${dark ? "bg-ivory/10" : "bg-linen"}`}>
          {image ? (
            <ResponsiveImage
              image={image}
              alt=""
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out ${soldOut ? "opacity-60" : ""}`}
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${soldOut ? "opacity-60" : ""}`} aria-hidden="true">
              <span className={`font-serif text-body ${dark ? "text-ivory/70" : "text-charcoal/70"}`}>Anaiza Nest</span>
            </div>
          )}
        </div>
      </a>

      {/* The tag is the card's own text, not part of the picture's link (which is only a second way to the same page). */}
      {tag && (
        <span className={`pointer-events-none absolute left-2 top-2 rounded-btn px-2.5 py-1.5 text-card-tag ${TAG_CLASS[tag.kind]}`}>
          {tag.text}
        </span>
      )}

      <button
        type="button"
        onClick={() => toggle(product)}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={`absolute right-2 top-2 ${squareButton} ${dark ? "bg-deepink/40" : ""}`}
      >
        <svg aria-hidden="true" focusable="false"
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4"
        >
          <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3 2.5-2 4-3 6-3 3.6 0 5.5 3.4 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
        </svg>
      </button>

      <div className="mt-3 flex flex-1 flex-col">
        <a href={`/product/${product.slug}`} className="block">
          <h3 className={`line-clamp-2 text-card-name ${dark ? "text-ivory" : "text-charcoal"}`}>{product.name}</h3>
        </a>
        {/* Nothing at all unless the product has an approved review. */}
        <div className="empty:hidden">
          <RatingSummary average={product.rating_average} count={product.rating_count} compact dark={dark} />
        </div>

        {/* The price on the left, the cart button on the right: under the photograph, never over the name or the picture. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className={`text-card-price ${dark ? "text-ivory" : "text-navy"}`}>{formatPrice(price.current)}</span>
              {price.old !== null && (
                <span className={`text-caption line-through ${dark ? "text-ivory/70" : "text-stone"}`}>{formatPrice(price.old)}</span>
              )}
            </p>
            {isLowStock(product.stock_quantity) && (
              <p className={`text-caption ${dark ? "text-ivory/70" : "text-stone"}`}>Only a few left</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => addItem(product, null, 1)}
            disabled={soldOut}
            className={squareButton}
            aria-label={soldOut ? "Sold out" : "Add to cart"}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
