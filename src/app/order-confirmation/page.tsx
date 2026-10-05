"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment";
import { formatDays, resolvePolicy } from "@/lib/policy";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { trackPurchase } from "@/lib/tracking";
import type { Order } from "@/lib/types";

const TRACKED_ORDERS_KEY = "anaiza-purchase-tracked";

// A page refresh (or back/forward) would re-run this effect against the
// same order still sitting in sessionStorage -- this guard makes sure the
// purchase event only ever fires once per order.
function alreadyTrackedPurchase(orderId: number): boolean {
  try {
    const tracked = JSON.parse(window.sessionStorage.getItem(TRACKED_ORDERS_KEY) ?? "[]") as number[];
    if (tracked.includes(orderId)) return true;
    window.sessionStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify([...tracked, orderId]));
    return false;
  } catch {
    return false;
  }
}

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
  const supportPhone = siteSettings?.contact_phone ?? null;

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("anaiza-last-order");
      const parsed = raw ? (JSON.parse(raw) as Order) : null;
      // One-time sync from sessionStorage on mount — see CartContext.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(parsed);
      if (parsed && !alreadyTrackedPurchase(parsed.id)) {
        trackPurchase(parsed);
      }
    } catch {
      setOrder(null);
    }
  }, []);

  if (order === undefined) return null;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">No recent order found</h1>
        <p className="mt-4 text-body text-stone">
          We couldn&apos;t find a recent order to show. If you just placed one, check your phone for a
          confirmation, or look it up on the Track order page.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-caption font-medium text-navy">Order confirmed</p>
      <h1 className="mt-2 font-serif text-charcoal text-h1">
        Thank you, {order.customer.name.split(" ")[0]}.
      </h1>
      {/* The kit's order-confirmed line, said as the host. */}
      <p className="mt-4 text-body text-charcoal/80">
        Order <span className="font-semibold text-charcoal">#{order.id}</span> is confirmed. Your order is being
        packed by hand and will be with you soon.
      </p>

      <div className="mt-10 rounded-xl border border-linen p-6">
        <h2 className="font-serif text-charcoal text-h2">Order details</h2>

        <ul className="mt-4 divide-y divide-linen">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-4 text-body">
              <span className="text-charcoal/70">
                {item.product_name}
                {item.variant_name ? ` (${item.variant_name}: ${item.variant_value})` : ""}{" "}
                &times; {item.quantity}
              </span>
              <span className="font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-linen pt-4 text-body text-charcoal/70">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium text-charcoal">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="font-medium text-charcoal">
              {order.delivery_fee === 0 ? "Free" : formatPrice(order.delivery_fee)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-linen pt-4 text-base font-semibold text-charcoal">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-linen p-6 text-body text-charcoal/70">
        <h2 className="font-serif text-charcoal text-h2">Shipping to</h2>
        <p className="mt-2">{order.customer.name}</p>
        <p>{order.customer.address}</p>
        <p>
          {order.customer.thana}, {order.customer.district}, {order.customer.division}
        </p>
        {order.customer.email && <p className="mt-2">{order.customer.email}</p>}
        <p>{order.customer.phone}</p>
      </div>

      <section className="mt-6 rounded-xl border border-linen p-6">
        <h2 className="font-serif text-charcoal text-h2">What happens next</h2>
        <ol className="mt-4 space-y-4 text-body text-charcoal/70">
          <li>
            <span className="font-medium text-charcoal">Keep your order number.</span> It is #{order.id}. With the phone
            number you ordered with, it lets you follow this order on the{" "}
            <Link href="/track-order" className="underline hover:text-navy">
              Track order
            </Link>{" "}
            page.
          </li>
          <li>
            <span className="font-medium text-charcoal">Delivery.</span> Orders to{" "}
            {order.customer.division === "Dhaka" ? "addresses inside Dhaka" : "addresses outside Dhaka"} usually take{" "}
            {formatDays(
              order.customer.division === "Dhaka" ? policy.delivery_days_dhaka : policy.delivery_days_outside_dhaka,
            )}{" "}
            business days.
          </li>
          <li>
            <span className="font-medium text-charcoal">Payment.</span>{" "}
            {order.payment_method === "cod"
              ? `Pay ${formatPrice(order.total)} in cash when your order arrives.`
              : `You chose ${paymentMethodLabel(order.payment_method)} for ${formatPrice(order.total)}.`}
          </li>
          <li>
            <span className="font-medium text-charcoal">Questions?</span>{" "}
            {supportPhone ? (
              <>
                Call{" "}
                <a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="underline hover:text-navy">
                  {supportPhone}
                </a>{" "}
                or{" "}
                <a
                  href={`https://wa.me/${supportPhone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-navy"
                >
                  message us on WhatsApp
                </a>
                , and mention order #{order.id}.
              </>
            ) : (
              <>
                Use the{" "}
                <Link href="/contact" className="underline hover:text-navy">
                  Contact
                </Link>{" "}
                page and mention order #{order.id}.
              </>
            )}
          </li>
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          Continue shopping
        </Link>
        <Link
          href="/track-order"
          className="inline-flex items-center justify-center rounded-btn border border-stone/80 px-8 py-4 text-button text-charcoal hover:bg-linen"
        >
          Track this order
        </Link>
      </div>
    </div>
  );
}
