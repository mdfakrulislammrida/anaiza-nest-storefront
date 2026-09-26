"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/types";

export default function AddToCartForm({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [variantId, setVariantId] = useState<number | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const inStock = product.stock_quantity > 0;
  const maxQuantity = Math.max(product.stock_quantity, 0);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId],
  );

  function handleAddToCart() {
    if (!inStock) return;
    addItem(product, selectedVariant, quantity);
  }

  function handleBuyNow() {
    if (!inStock) return;
    addItem(product, selectedVariant, quantity);
    router.push("/checkout");
  }

  return (
    <div className="space-y-5">
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Options
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  variant.id === variantId
                    ? "border-navy bg-navy text-white"
                    : "border-line text-ink hover:border-navy"
                }`}
              >
                {variant.name}: {variant.value}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-line">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-pill"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex h-10 w-10 items-center justify-center text-sm font-medium text-ink">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-pill"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Fixed to the viewport bottom on mobile (below the sticky header,
          which is a different corner of the screen, and below the cart
          drawer's z-50) so the primary actions stay reachable without
          scrolling back up; reverts to normal in-flow placement at sm and
          up, where there's no need for it. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-ivory p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:shadow-none sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock}
          className="flex-1 rounded-full bg-navy px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {inStock ? "Add to Cart" : "Out of stock"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!inStock}
          className="flex-1 rounded-full border border-navy bg-ivory px-8 py-3.5 text-sm font-medium text-navy transition-colors hover:bg-pill disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buy Now
        </button>
      </div>

      <p className="text-xs text-muted">
        1–3 business days inside Dhaka, 3–5 outside. Free inside Dhaka over ৳2,000.
      </p>
      <p className="text-xs text-muted">Pay with bKash, Nagad, Rocket, or Cash on Delivery.</p>
    </div>
  );
}
