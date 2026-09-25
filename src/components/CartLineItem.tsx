"use client";

import Image from "next/image";
import { useCart, type CartItem } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 border-b border-line py-6">
      {/* Plain <a>: /product/<slug> is a single static shell that needs a
          real navigation, not next/link's client-side routing. */}
      <a
        href={`/product/${item.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-pill"
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-serif text-xs text-ink/30">Anaiza Nest</span>
          </div>
        )}
      </a>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href={`/product/${item.slug}`} className="text-sm font-medium text-ink hover:text-navy">
              {item.name}
            </a>
            {item.variantLabel && <p className="text-xs text-muted">{item.variantLabel}</p>}
          </div>
          <p className="whitespace-nowrap font-medium text-ink">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-pill"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-8 w-10 items-center justify-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-pill"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.key)}
            className="text-sm text-muted underline-offset-2 transition-colors hover:text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
