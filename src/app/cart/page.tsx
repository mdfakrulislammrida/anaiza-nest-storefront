"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import CartLineItem from "@/components/CartLineItem";

export default function CartPage() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-ink">Your cart is empty</h1>
        <p className="mt-3 text-muted">Browse the collection and find something worth keeping.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Cart</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Your Cart</h1>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          {items.map((item) => (
            <CartLineItem key={item.key} item={item} />
          ))}
        </div>

        <aside className="lg:w-80">
          <div className="rounded-xl border border-line p-6">
            <h2 className="font-serif text-xl text-ink">Order Summary</h2>

            <div className="mt-6 space-y-3 text-sm text-ink/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-muted">Calculated at checkout</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex h-11 items-center justify-center rounded-full bg-navy text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/shop"
              className="mt-2 flex h-11 items-center justify-center rounded-full border border-line text-sm font-medium text-ink hover:bg-pill"
            >
              Continue Shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
