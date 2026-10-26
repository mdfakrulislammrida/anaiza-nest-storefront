"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import CartLineItem from "@/components/CartLineItem";
import FreeDeliveryProgress from "@/components/FreeDeliveryProgress";
import CartRecoveryRestore from "@/components/CartRecoveryRestore";
import EmptyState from "@/components/EmptyState";
import TrustBadges from "@/components/TrustBadges";
import { CTA } from "@/lib/brand";
import { trackViewCart } from "@/lib/tracking";

export default function CartPage() {
  const { items, subtotal, ready } = useCart();

  // GA4's view_cart: once per visit to this page, when the saved cart has been read and has something in it.
  const cartViewed = useRef(false);
  useEffect(() => {
    if (!ready || cartViewed.current || items.length === 0) return;
    cartViewed.current = true;
    trackViewCart(items, subtotal);
  }, [ready, items, subtotal]);

  if (items.length === 0) {
    return (
      <>
        <CartRecoveryRestore />
      {/* Until the saved cart has been read the page keeps a screen's height, so the footer does not jump when it fills. */}
      <div className={ready ? "" : "min-h-screen"}>
        <EmptyState
          heading="h1"
          title="Your cart is empty"
          text="Browse the collection and find something worth keeping."
          linkHref="/shop?search=tea%20sets"
          linkLabel={CTA.shopTeaSets}
        />
      </div>
      </>
    );
  }

  return (
    <>
      <CartRecoveryRestore />
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
          <div className="rounded-btn border border-linen p-6">
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

            <FreeDeliveryProgress subtotal={subtotal} className="mt-4" />
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
            <TrustBadges compact />
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
