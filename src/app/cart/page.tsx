"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import CartLineItem from "@/components/CartLineItem";
import { CTA } from "@/lib/brand";

export default function CartPage() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">Your cart is empty</h1>
        <p className="mt-4 text-body text-stone">Browse the collection and find something worth keeping.</p>
        <Link
          href="/shop?search=tea%20sets"
          className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          {CTA.shopTeaSets}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">Cart</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">Your cart</h1>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          {items.map((item) => (
            <CartLineItem key={item.key} item={item} />
          ))}
        </div>

        <aside className="lg:w-80">
          <div className="rounded-xl border border-linen p-6">
            <h2 className="font-serif text-charcoal text-h2">Order summary</h2>

            <div className="mt-6 space-y-4 text-body text-charcoal/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-charcoal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-stone">Calculated at checkout</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-linen pt-4 text-base font-semibold text-charcoal">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex h-11 items-center justify-center rounded-btn bg-burgundy text-button text-ivory transition-opacity hover:opacity-90"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/shop"
              className="mt-2 flex h-11 items-center justify-center rounded-btn border border-stone/80 text-button text-charcoal hover:bg-linen"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
