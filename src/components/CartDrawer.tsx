"use client";

import Image from "next/image";
import Link from "next/link";
import { maxQuantityFor, useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function CartDrawer() {
  const { items, subtotal, isDrawerOpen, closeDrawer, updateQuantity, removeItem } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Shopping cart">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className="absolute inset-0 bg-deepink/40"
      />

      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-linen bg-ivory">
        <div className="flex items-center justify-between border-b border-linen px-6 py-4">
          <h2 className="font-serif text-charcoal text-h2">Your cart ({items.length})</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal hover:bg-linen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-body text-stone">Your cart is empty. Browse the collection and find something worth keeping.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4">
                  {/* Plain <a>: /product/<slug> is a single static shell
                      that needs a real navigation, not next/link's
                      client-side routing. */}
                  <a
                    href={`/product/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-linen"
                  >
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    )}
                  </a>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/product/${item.slug}`}
                        onClick={closeDrawer}
                        className="text-body font-medium text-charcoal hover:text-navy"
                      >
                        {item.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label="Remove item"
                        className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-stone hover:text-navy"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {item.variantLabel && <p className="text-caption text-stone">{item.variantLabel}</p>}
                    {item.stock > 0 && item.quantity >= item.stock && (
                      <p className="text-caption text-stone">
                        {item.stock === 1 ? "Only 1 available" : `Only ${item.stock} available`}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="flex h-11 w-11 items-center justify-center rounded-btn border border-stone/80 text-charcoal"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-body">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          disabled={item.quantity >= maxQuantityFor(item)}
                          className="flex h-11 w-11 items-center justify-center rounded-btn border border-stone/80 text-charcoal disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-body font-medium text-charcoal">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-linen px-6 py-4">
            <div className="flex items-center justify-between text-body">
              <span className="text-stone">Subtotal</span>
              <span className="font-semibold text-charcoal">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-caption text-stone">
              Shipping and payment method (bKash / Nagad / Rocket / COD) selected at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="mt-4 flex h-11 items-center justify-center rounded-btn bg-navy text-button text-ivory transition-opacity hover:opacity-90"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="mt-2 flex h-11 items-center justify-center rounded-btn border border-stone/80 text-button text-charcoal hover:bg-linen"
            >
              View cart
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
