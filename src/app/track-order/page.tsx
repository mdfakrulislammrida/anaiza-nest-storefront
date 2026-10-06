"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, lookupOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import PaymentStateNotice from "@/components/PaymentStateNotice";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-semibold text-stone";

// Sentence case for the status the API sends in lower case (e.g. "in_transit" -> "In transit").
function statusLabel(status: string): string {
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TrackOrderPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setOrder(null);

    const form = new FormData(event.currentTarget);
    const orderId = String(form.get("order_id") ?? "");
    const phone = String(form.get("phone") ?? "");

    try {
      const found = await lookupOrder(orderId, phone);
      setOrder(found);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError && err.status === 404
          ? "No order found with that ID and phone number."
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">Track order</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">Track your order</h1>
      <p className="mt-2 text-body text-stone">
        Enter your order number and phone number to see where your order is.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className={labelClass}>Order number</label>
          <input name="order_id" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone number</label>
          <input name="phone" type="tel" required className={inputClass} />
        </div>
        {error && <p className="text-body text-burgundy">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "Searching..." : "Track order"}
        </button>
      </form>

      {order && (
        <div className="mt-10 rounded-xl border border-linen p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-charcoal text-h2">Order #{order.id}</h2>
            <span className="rounded-btn bg-linen px-4 py-1 text-caption font-medium text-navy">
              {statusLabel(order.status)}
            </span>
          </div>

          {order.payment_status && order.payment_status !== "cod" && (
            <div className="mt-4">
              <PaymentStateNotice status={order.payment_status} />
            </div>
          )}

          <ul className="mt-4 divide-y divide-linen">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-4 text-body">
                <span className="text-charcoal/70">
                  {item.product_name} &times; {item.quantity}
                </span>
                <span className="font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-linen pt-4 text-base font-semibold text-charcoal">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
