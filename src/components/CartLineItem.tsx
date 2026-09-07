"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 border-b border-ink/10 py-6">
      <Link
        href={`/product/${item.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden bg-ink/5"
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-serif text-xs text-ink/30">Anaiza</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/product/${item.slug}`}
              className="font-serif text-lg text-ink hover:text-gold"
            >
              {item.name}
            </Link>
            {item.variantLabel && (
              <p className="text-sm text-ink/50">{item.variantLabel}</p>
            )}
          </div>
          <p className="whitespace-nowrap font-medium text-ink">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center border border-ink/20">
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-ink/5"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-8 w-10 items-center justify-center text-sm">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-ink/5"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.key)}
            className="text-sm text-ink/50 underline-offset-2 transition-colors hover:text-burgundy hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
