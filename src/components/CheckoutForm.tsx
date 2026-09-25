"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ApiError, createOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BD_DISTRICTS_BY_DIVISION, BD_DIVISIONS, type BdDivision } from "@/lib/bangladesh-geography";
import type { CreateOrderPayload, PaymentMethod, PaymentSetting } from "@/lib/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; initial: string }[] = [
  { value: "bkash", label: "bKash", initial: "b" },
  { value: "nagad", label: "Nagad", initial: "N" },
  { value: "rocket", label: "Rocket", initial: "R" },
  { value: "cod", label: "Cash on Delivery", initial: "C" },
];

const FREE_DELIVERY_THRESHOLD = 2000;
const DHAKA_FEE = 80;
const OUTSIDE_DHAKA_FEE = 130;

// Mirrors the backend's DeliveryFeeCalculator so the order summary can show
// a live estimate before submitting — the server always recomputes and
// charges the authoritative fee itself.
function estimateDeliveryFee(division: string, subtotal: number): number {
  if (division !== "Dhaka") return OUTSIDE_DHAKA_FEE;
  return subtotal > FREE_DELIVERY_THRESHOLD ? 0 : DHAKA_FEE;
}

export default function CheckoutForm({ paymentSettings }: { paymentSettings: PaymentSetting | null }) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const paymentMethods = useMemo(
    () => PAYMENT_METHODS.filter((method) => method.value !== "cod" || paymentSettings?.cod_enabled !== false),
    [paymentSettings],
  );

  const [division, setDivision] = useState<BdDivision | "">("");
  const [district, setDistrict] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.value ?? "cod");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);

  const districts = division ? BD_DISTRICTS_BY_DIVISION[division] : [];
  const deliveryFee = division ? estimateDeliveryFee(division, subtotal) : null;

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-ink">Nothing to check out</h1>
        <p className="mt-3 text-muted">Your cart is currently empty.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
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

    if (!division || !district) {
      setFormError("Please select your division and district.");
      return;
    }

    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("customer_email") ?? "").trim();

    const payload: CreateOrderPayload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_email: email || null,
      customer_phone: String(form.get("customer_phone") ?? ""),
      customer_address: String(form.get("customer_address") ?? ""),
      division,
      district,
      thana: String(form.get("thana") ?? ""),
      payment_method: paymentMethod,
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
        setFormError("Something went wrong placing your order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function errorFor(field: string) {
    const message = fieldErrors[field]?.[0];
    return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-pill disabled:text-muted";
  const labelClass = "text-xs font-semibold uppercase tracking-widest text-muted";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/cart" className="hover:text-navy">
          Cart
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Checkout</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Checkout</h1>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 space-y-8">
          <fieldset className="space-y-4">
            <legend className="font-serif text-xl text-ink">Shipping details</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full name</label>
                <input name="customer_name" required className={inputClass} />
                {errorFor("customer_name")}
              </div>
              <div>
                <label className={labelClass}>Phone number</label>
                <input name="customer_phone" type="tel" required className={inputClass} />
                {errorFor("customer_phone")}
              </div>
            </div>

            <div>
              <label className={labelClass}>Email (optional)</label>
              <input name="customer_email" type="email" className={inputClass} />
              {errorFor("customer_email")}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Division</label>
                <select
                  value={division}
                  onChange={(event) => {
                    setDivision(event.target.value as BdDivision);
                    setDistrict("");
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">Select division</option>
                  {BD_DIVISIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {errorFor("division")}
              </div>

              <div>
                <label className={labelClass}>District</label>
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  disabled={!division}
                  required
                  className={inputClass}
                >
                  <option value="">{division ? "Select district" : "Select division first"}</option>
                  {districts.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {errorFor("district")}
              </div>

              <div>
                <label className={labelClass}>Thana / Area</label>
                <input
                  name="thana"
                  disabled={!district}
                  required
                  placeholder={district ? "e.g. Banani, Gulshan" : "Select district first"}
                  className={inputClass}
                />
                {errorFor("thana")}
              </div>
            </div>

            <div>
              <label className={labelClass}>Street address</label>
              <input name="customer_address" required className={inputClass} />
              {errorFor("customer_address")}
            </div>

            <p className="text-xs text-muted">
              Select your division, district and thana/area to calculate delivery
              area and shipping.
            </p>

            <div>
              <label className={labelClass}>Order notes (optional)</label>
              <textarea name="gift_note" rows={3} className={inputClass} />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-serif text-xl text-ink">Payment method</legend>
            <p className="text-sm text-muted">
              Pay instantly with a mobile wallet, or choose Cash on Delivery.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    paymentMethod === method.value ? "border-navy bg-pill" : "border-line hover:border-navy"
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                    {method.initial}
                  </span>
                  {method.label}
                </label>
              ))}
            </div>

            {paymentMethod === "bkash" && paymentSettings?.bkash_number && (
              <p className="text-sm text-ink/70">
                Send payment to bKash number{" "}
                <span className="font-semibold text-ink">{paymentSettings.bkash_number}</span>.
              </p>
            )}
            {paymentMethod === "nagad" && paymentSettings?.nagad_number && (
              <p className="text-sm text-ink/70">
                Send payment to Nagad number{" "}
                <span className="font-semibold text-ink">{paymentSettings.nagad_number}</span>.
              </p>
            )}
            {paymentMethod === "rocket" && paymentSettings?.rocket_number && (
              <p className="text-sm text-ink/70">
                Send payment to Rocket number{" "}
                <span className="font-semibold text-ink">{paymentSettings.rocket_number}</span>.
              </p>
            )}
            {paymentMethod === "cod" && (
              <p className="text-sm text-ink/70">Pay when your order arrives.</p>
            )}
          </fieldset>
        </form>

        <aside className="lg:w-80">
          <div className="rounded-xl border border-line p-6">
            <h2 className="font-serif text-xl text-ink">Order Summary</h2>

            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between text-sm text-ink/70">
                  <span>
                    {item.name}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} &times; {item.quantity}
                  </span>
                  <span className="whitespace-nowrap font-medium text-ink">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm text-ink/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium text-ink">
                  {deliveryFee === null ? "Calculated at address" : formatPrice(deliveryFee)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(subtotal + (deliveryFee ?? 0))}</span>
            </div>

            {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-navy px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Placing order..." : "Place Order"}
            </button>

            <p className="mt-3 text-center text-xs text-muted">
              By placing this order you agree to our{" "}
              <a href="/pages/terms" className="underline hover:text-navy">
                Terms
              </a>{" "}
              and{" "}
              <a href="/pages/returns" className="underline hover:text-navy">
                Return Policy
              </a>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
