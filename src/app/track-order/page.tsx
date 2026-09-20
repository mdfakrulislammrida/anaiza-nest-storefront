"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, lookupOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-muted";

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
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Track Order</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Track Your Order</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your order ID and phone number to see the latest status.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className={labelClass}>Order ID</label>
          <input name="order_id" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input name="phone" type="tel" required className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "Searching..." : "Track Order"}
        </button>
      </form>

      {order && (
        <div className="mt-10 rounded-xl border border-line p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-ink">Order #{order.id}</h2>
            <span className="rounded-full bg-pill px-3 py-1 text-xs font-medium capitalize text-navy">
              {order.status}
            </span>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <span className="text-ink/70">
                  {item.product_name} &times; {item.quantity}
                </span>
                <span className="font-medium text-ink">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-semibold text-ink">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
