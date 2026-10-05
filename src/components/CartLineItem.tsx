"use client";

import Image from "next/image";
import { maxQuantityFor, useCart, type CartItem } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const maxQuantity = maxQuantityFor(item);
  const atMax = item.quantity >= maxQuantity;

  return (
    <div className="flex gap-4 border-b border-linen py-6">
      {/* Plain <a>: /product/<slug> is a single static shell that needs a
          real navigation, not next/link's client-side routing. */}
      <a
        href={`/product/${item.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-linen"
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-serif text-caption text-charcoal/30">Anaiza Nest</span>
          </div>
        )}
      </a>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href={`/product/${item.slug}`} className="text-body font-medium text-charcoal hover:text-navy">
              {item.name}
            </a>
            {item.variantLabel && <p className="text-caption text-stone">{item.variantLabel}</p>}
            {atMax && item.stock > 0 && (
              <p className="mt-1 text-caption text-stone">
                {item.stock === 1 ? "Only 1 available" : `Only ${item.stock} available`}
              </p>
            )}
          </div>
          <p className="whitespace-nowrap font-medium text-charcoal">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-btn border border-stone/80">
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              className="flex h-11 w-11 items-center justify-center text-charcoal transition-colors hover:bg-linen"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-11 w-11 items-center justify-center text-body">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              disabled={atMax}
              className="flex h-11 w-11 items-center justify-center text-charcoal transition-colors hover:bg-linen disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.key)}
            className="min-h-11 px-2 text-body text-stone underline-offset-2 transition-colors hover:text-navy hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
