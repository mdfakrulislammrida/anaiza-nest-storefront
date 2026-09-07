"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("anaiza-last-order");
      setOrder(raw ? (JSON.parse(raw) as Order) : null);
    } catch {
      setOrder(null);
    }
  }, []);

  if (order === undefined) return null;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink">No recent order found</h1>
        <p className="mt-3 text-ink/60">
          We couldn&apos;t find an order to show. If you just placed one, check
          your email for a confirmation.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
        Order confirmed
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
        Thank you, {order.customer.name.split(" ")[0]}.
      </h1>
      <p className="mt-3 text-ink/70">
        Order <span className="font-semibold text-ink">#{order.id}</span> has
        been placed and will be paid via{" "}
        <span className="font-semibold text-ink">{order.payment_method}</span>.
      </p>

      <div className="mt-10 border border-ink/10 p-6">
        <h2 className="font-serif text-xl text-ink">Order details</h2>

        <ul className="mt-4 divide-y divide-ink/10">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <span className="text-ink/70">
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name}: ${item.variant_value})` : ""}{" "}
                &times; {item.quantity}
              </span>
              <span className="font-medium text-ink">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm text-ink/70">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium text-ink">
              {formatPrice(order.subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="font-medium text-ink">
              {formatPrice(order.delivery_fee)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-ink/10 pt-4 text-base font-semibold text-ink">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-8 border border-ink/10 p-6 text-sm text-ink/70">
        <h2 className="font-serif text-lg text-ink">Shipping to</h2>
        <p className="mt-2">{order.customer.name}</p>
        <p>{order.customer.address}</p>
        <p>
          {order.customer.city}, {order.customer.postal_code}
        </p>
        <p className="mt-2">{order.customer.email}</p>
        <p>{order.customer.phone}</p>
        {order.shipping_zone && (
          <p className="mt-2">
            {order.shipping_zone.name}
            {order.shipping_zone.estimated_days
              ? ` · Est. ${order.shipping_zone.estimated_days}`
              : ""}
          </p>
        )}
      </div>

      <Link
        href="/shop"
        className="mt-10 inline-flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
      >
        Continue shopping
      </Link>
    </div>
  );
}
