"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { FLAT_DELIVERY_FEE } from "@/lib/config";
import CartLineItem from "@/components/CartLineItem";

export default function CartPage() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink">Your cart is empty</h1>
        <p className="mt-3 text-ink/60">
          Browse the collection and find something worth keeping.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
        >
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Your cart</h1>

      <div className="mt-10 flex flex-col gap-12 lg:flex-row">
        <div className="flex-1">
          {items.map((item) => (
            <CartLineItem key={item.key} item={item} />
          ))}
        </div>

        <aside className="lg:w-80">
          <div className="border border-ink/10 p-6">
            <h2 className="font-serif text-xl text-ink">Order summary</h2>

            <div className="mt-6 space-y-3 text-sm text-ink/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-ink">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium text-ink">
                  {formatPrice(FLAT_DELIVERY_FEE)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-ink/10 pt-4 text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(subtotal + FLAT_DELIVERY_FEE)}</span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
            >
              Proceed to checkout
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
