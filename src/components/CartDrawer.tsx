"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
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
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-lg text-ink">Your Cart({items.length})</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-pill"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-pill"
                  >
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    )}
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={closeDrawer}
                        className="text-sm font-medium text-ink hover:text-navy"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label="Remove item"
                        className="shrink-0 text-muted hover:text-red-600"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {item.variantLabel && <p className="text-xs text-muted">{item.variantLabel}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-line text-ink"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-line text-ink"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-medium text-ink">
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
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Shipping and payment method (bKash / Nagad / Rocket / COD) selected at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="mt-4 flex h-11 items-center justify-center rounded-full bg-navy text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="mt-2 flex h-11 items-center justify-center rounded-full border border-line text-sm font-medium text-ink hover:bg-pill"
            >
              View full cart
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
