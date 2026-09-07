"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/types";

export default function AddToCartForm({ product }: { product: Product }) {
  const { addItem } = useCart();
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<number | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const inStock = product.stock_quantity > 0;
  const maxQuantity = Math.max(product.stock_quantity, 0);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId],
  );

  function handleAdd() {
    if (!inStock) return;
    addItem(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  }

  return (
    <div className="space-y-6">
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">
            Options
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                className={`border px-4 py-2 text-sm font-medium transition-colors ${
                  variant.id === variantId
                    ? "border-ink bg-ink text-ivory"
                    : "border-ink/20 text-ink hover:border-gold"
                }`}
              >
                {variant.name}: {variant.value}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">
          Quantity
        </p>
        <div className="flex w-fit items-center border border-ink/20">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-ink/5"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex h-10 w-12 items-center justify-center text-sm font-medium text-ink">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-ink/5"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!inStock}
        className="w-full bg-ink px-8 py-4 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy disabled:cursor-not-allowed disabled:bg-ink/30"
      >
        {inStock ? "Add to cart" : "Out of stock"}
      </button>

      {justAdded && (
        <p className="text-sm text-ink/70">
          Added to your cart.{" "}
          <Link href="/cart" className="font-semibold text-gold hover:text-burgundy">
            View cart &rarr;
          </Link>
        </p>
      )}
    </div>
  );
}
