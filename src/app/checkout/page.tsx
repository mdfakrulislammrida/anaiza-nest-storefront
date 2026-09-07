"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ApiError, createOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { FLAT_DELIVERY_FEE } from "@/lib/config";
import type { CreateOrderPayload, PaymentMethod } from "@/lib/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cod", label: "Cash on delivery" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "card", label: "Card" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink">Nothing to check out</h1>
        <p className="mt-3 text-ink/60">Your cart is currently empty.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy"
        >
          Shop the collection
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload: CreateOrderPayload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_email: String(form.get("customer_email") ?? ""),
      customer_phone: String(form.get("customer_phone") ?? ""),
      customer_address: String(form.get("customer_address") ?? ""),
      customer_city: String(form.get("customer_city") ?? ""),
      customer_postal_code: String(form.get("customer_postal_code") ?? ""),
      payment_method: paymentMethod,
      delivery_fee: FLAT_DELIVERY_FEE,
      gift_note: String(form.get("gift_note") ?? "") || null,
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
      })),
    };

    try {
      const order = await createOrder(payload);
      window.sessionStorage.setItem("anaiza-last-order", JSON.stringify(order));
      setOrderPlaced(true);
      clearCart();
      router.push("/order-confirmation");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setFieldErrors(error.errors);
        setFormError("Please check the highlighted fields and try again.");
      } else {
        setFormError(
          "Something went wrong placing your order. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function errorFor(field: string) {
    const message = fieldErrors[field]?.[0];
    return message ? (
      <p className="mt-1 text-xs text-burgundy">{message}</p>
    ) : null;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Checkout</h1>

      <div className="mt-10 flex flex-col gap-12 lg:flex-row">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-8"
        >
          <fieldset className="space-y-4">
            <legend className="font-serif text-xl text-ink">Contact &amp; delivery</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                  Full name
                </label>
                <input
                  name="customer_name"
                  required
                  className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
                {errorFor("customer_name")}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                  Phone
                </label>
                <input
                  name="customer_phone"
                  type="tel"
                  required
                  className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
                {errorFor("customer_phone")}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                Email
              </label>
              <input
                name="customer_email"
                type="email"
                required
                className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
              {errorFor("customer_email")}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                Address
              </label>
              <input
                name="customer_address"
                required
                className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
              {errorFor("customer_address")}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                  City
                </label>
                <input
                  name="customer_city"
                  required
                  className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
                {errorFor("customer_city")}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
                  Postal code
                </label>
                <input
                  name="customer_postal_code"
                  required
                  className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
                {errorFor("customer_postal_code")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-serif text-xl text-ink">Payment method</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm font-medium transition-colors ${
                    paymentMethod === method.value
                      ? "border-ink bg-ink text-ivory"
                      : "border-ink/20 text-ink hover:border-gold"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="sr-only"
                  />
                  {method.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-ink/60">
              Gift note (optional)
            </label>
            <textarea
              name="gift_note"
              rows={3}
              className="mt-1 w-full border border-ink/20 bg-ivory px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
            />
          </div>
        </form>

        <aside className="lg:w-80">
          <div className="border border-ink/10 p-6">
            <h2 className="font-serif text-xl text-ink">Order summary</h2>

            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between text-sm text-ink/70">
                  <span>
                    {item.name}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} &times;{" "}
                    {item.quantity}
                  </span>
                  <span className="whitespace-nowrap font-medium text-ink">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-ink/10 pt-4 text-sm text-ink/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
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

            {formError && (
              <p className="mt-4 text-sm text-burgundy">{formError}</p>
            )}

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="mt-6 w-full bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-burgundy disabled:cursor-not-allowed disabled:bg-ink/30"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
