"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ApiError, createOrder } from "@/lib/api";
import { getStoredUtmParams } from "@/lib/attribution";
import { trackAddPaymentInfo, trackAddShippingInfo, trackBeginCheckout } from "@/lib/tracking";
import { formatPrice } from "@/lib/format";
import { estimateDeliveryFee, resolvePolicy } from "@/lib/policy";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  BD_DISTRICTS_BY_DIVISION,
  BD_DIVISIONS,
  BD_UPAZILAS_BY_DISTRICT,
  type BdDivision,
} from "@/lib/bangladesh-geography";
import SearchableSelect from "./SearchableSelect";
import Seal from "./Seal";
import { CTA } from "@/lib/brand";
import type { CreateOrderPayload, PaymentMethod, PaymentSetting } from "@/lib/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; initial: string }[] = [
  { value: "bkash", label: "bKash", initial: "b" },
  { value: "nagad", label: "Nagad", initial: "N" },
  { value: "rocket", label: "Rocket", initial: "R" },
  { value: "cod", label: "Cash on delivery", initial: "C" },
];

// Field names the form shows an inline error for. Any other validation key (the server's
// "items" stock check, for one) has no field to light up, so its message is shown in the alert instead.
const FORM_FIELDS = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_address",
  "division",
  "district",
  "thana",
  "payment_method",
  "gift_note",
];

export default function CheckoutForm({ paymentSettings }: { paymentSettings: PaymentSetting | null }) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  // The order summary shows a live estimate from the editable delivery settings;
  // the server always recomputes and charges the authoritative fee itself.
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
  const supportPhone = siteSettings?.contact_phone ?? null;
  const uid = useId();
  const alertRef = useRef<HTMLDivElement>(null);

  const paymentMethods = useMemo(
    () => PAYMENT_METHODS.filter((method) => method.value !== "cod" || paymentSettings?.cod_enabled !== false),
    [paymentSettings],
  );

  // Dhaka is by far the most common destination -- preselected as a
  // convenience, but both stay one tap away from changing.
  const [division, setDivision] = useState<BdDivision | "">("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.value ?? "cod");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Server messages that belong to no single field, e.g. "Insufficient stock for ...".
  const [orderProblems, setOrderProblems] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Bumped whenever a problem should be brought into view. The effect below runs after the alert
  // and the field errors are on screen, then moves the visitor to what needs fixing: the first
  // invalid text field if there is one, otherwise the alert. Without this the message sat below
  // the fold, next to a button the visitor had already scrolled past.
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (revealCount === 0) return;
    const firstInvalid = document
      .getElementById("checkout-form")
      ?.querySelector<HTMLElement>('[aria-invalid="true"]:not(button)');
    const target = firstInvalid ?? alertRef.current;
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [revealCount]);

  const districts = division ? BD_DISTRICTS_BY_DIVISION[division] : [];
  // Falls back to free-text whenever a district's upazila list is missing or
  // empty, so a data gap never blocks checkout.
  const upazilas = district ? (BD_UPAZILAS_BY_DISTRICT[district] ?? []) : [];
  const deliveryFee = division ? estimateDeliveryFee(policy, division, subtotal) : null;

  useEffect(() => {
    if (items.length > 0) trackBeginCheckout(items, subtotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when the checkout page is first reached with items in the cart, not on every subtotal change
  }, []);

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">Nothing to check out</h1>
        <p className="mt-4 text-body text-stone">Your cart is empty. Browse the collection and find something worth keeping.</p>
        <Link
          href="/shop?search=tea%20sets"
          className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          {CTA.shopTeaSets}
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormError(null);
    setOrderProblems([]);
    setFieldErrors({});

    if (!division || !district || !thana) {
      setFormError("Please select your division, district and thana/area.");
      setRevealCount((count) => count + 1);
      return;
    }

    setSubmitting(true);

    const form = new FormData(formElement);
    const email = String(form.get("customer_email") ?? "").trim();

    const payload: CreateOrderPayload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_email: email || null,
      customer_phone: String(form.get("customer_phone") ?? ""),
      customer_address: String(form.get("customer_address") ?? ""),
      division,
      district,
      thana,
      payment_method: paymentMethod,
      gift_note: String(form.get("gift_note") ?? "") || null,
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
      })),
      ...getStoredUtmParams(),
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
        const unplaced = Object.entries(error.errors)
          .filter(([key]) => !FORM_FIELDS.includes(key))
          .flatMap(([, messages]) => messages);
        const hasFieldErrors = Object.keys(error.errors).some((key) => FORM_FIELDS.includes(key));

        setOrderProblems(unplaced);
        setFormError(
          unplaced.length > 0
            ? "We couldn't place your order."
            : hasFieldErrors
              ? "Please check the highlighted fields and try again."
              : error.message || "We couldn't place your order. Please try again.",
        );
      } else {
        setFormError("Sorry, we could not place your order just now. Please try again in a moment.");
      }
      setRevealCount((count) => count + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function errorFor(field: string) {
    const message = fieldErrors[field]?.[0];
    return message ? <p className="mt-1 text-caption text-burgundy">{message}</p> : null;
  }

  // text-base (not text-body): iOS Safari auto-zooms the page when a focused
  // input's font is under 16px, which text-body's 14px would trigger.
  const inputClass =
    "mt-1 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-linen disabled:text-stone";
  const labelClass = "text-caption font-medium text-stone";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/cart" className="hover:text-navy">
          Cart
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">Checkout</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">Checkout</h1>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 space-y-8">
          {formError && (
            <div
              ref={alertRef}
              role="alert"
              tabIndex={-1}
              className="rounded-btn border border-burgundy/30 bg-linen p-4 text-body text-burgundy focus:outline-none"
            >
              <p className="font-medium">{formError}</p>
              {orderProblems.length > 0 && (
                <>
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    {orderProblems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                  <p className="mt-4">
                    <Link href="/cart" className="font-medium underline">
                      Review your cart
                    </Link>{" "}
                    and lower the quantity, then place the order again.
                  </p>
                </>
              )}
              {supportPhone && (
                <p className="mt-4">
                  Need a hand? Call{" "}
                  <a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="font-medium underline">
                    {supportPhone}
                  </a>{" "}
                  or{" "}
                  <a
                    href={`https://wa.me/${supportPhone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium underline"
                  >
                    message us on WhatsApp
                  </a>
                  .
                </p>
              )}
            </div>
          )}

          <fieldset className="space-y-4">
            <legend className="font-serif text-h2 text-charcoal">Shipping details</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-name`} className={labelClass}>
                  Full name
                </label>
                <input
                  id={`${uid}-name`}
                  name="customer_name"
                  autoComplete="name"
                  required
                  aria-invalid={fieldErrors.customer_name ? true : undefined}
                  className={inputClass}
                />
                {errorFor("customer_name")}
              </div>
              <div>
                <label htmlFor={`${uid}-phone`} className={labelClass}>
                  Phone number
                </label>
                <input
                  id={`${uid}-phone`}
                  name="customer_phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  aria-invalid={fieldErrors.customer_phone ? true : undefined}
                  className={inputClass}
                />
                {errorFor("customer_phone")}
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-email`} className={labelClass}>
                Email (optional)
              </label>
              <input
                id={`${uid}-email`}
                name="customer_email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={fieldErrors.customer_email ? true : undefined}
                className={inputClass}
              />
              {errorFor("customer_email")}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SearchableSelect
                label="Division"
                value={division}
                options={[...BD_DIVISIONS]}
                placeholder="Select division"
                error={errorFor("division") ? fieldErrors.division?.[0] : null}
                onChange={(next) => {
                  const nextDivision = next as BdDivision;
                  setDivision(nextDivision);
                  setDistrict("");
                  setThana("");
                  if (nextDivision) trackAddShippingInfo(items, subtotal, nextDivision);
                }}
              />

              <SearchableSelect
                label="District"
                value={district}
                options={districts}
                disabled={!division}
                disabledHint="Select division first"
                placeholder="Select district"
                error={errorFor("district") ? fieldErrors.district?.[0] : null}
                onChange={(next) => {
                  setDistrict(next);
                  setThana("");
                }}
              />

              <div>
                {upazilas.length > 0 ? (
                  <SearchableSelect
                    label="Thana / Area"
                    value={thana}
                    options={upazilas}
                    disabled={!district}
                    disabledHint="Select district first"
                    placeholder="Select thana / area"
                    searchPlaceholder="Search thana / area..."
                    error={errorFor("thana") ? fieldErrors.thana?.[0] : null}
                    onChange={setThana}
                  />
                ) : (
                  <>
                    <label htmlFor={`${uid}-thana`} className={labelClass}>
                      Thana / Area
                    </label>
                    <input
                      id={`${uid}-thana`}
                      autoComplete="off"
                      aria-invalid={fieldErrors.thana ? true : undefined}
                      value={thana}
                      onChange={(event) => setThana(event.target.value)}
                      disabled={!district}
                      required
                      placeholder={district ? "e.g. Banani, Gulshan" : "Select district first"}
                      className={inputClass}
                    />
                    {errorFor("thana")}
                  </>
                )}
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-address`} className={labelClass}>
                Street address
              </label>
              <input
                id={`${uid}-address`}
                name="customer_address"
                autoComplete="street-address"
                required
                aria-invalid={fieldErrors.customer_address ? true : undefined}
                className={inputClass}
              />
              {errorFor("customer_address")}
            </div>

            <p className="text-caption text-stone">
              Select your division, district and thana/area to calculate delivery
              area and shipping.
            </p>

            <div>
              <label htmlFor={`${uid}-notes`} className={labelClass}>
                Gift note (optional)
              </label>
              <textarea id={`${uid}-notes`} name="gift_note" rows={3} autoComplete="off" className={inputClass} />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="font-serif text-h2 text-charcoal">Payment method</legend>
            <p className="text-body text-stone">
              {paymentSettings?.cod_enabled === false ? "Pay with a mobile wallet." : "Pay with a mobile wallet, or choose cash on delivery."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`flex cursor-pointer items-center gap-4 rounded-btn border px-4 py-4 text-button transition-colors ${
                    paymentMethod === method.value ? "border-navy bg-linen" : "border-stone/80 hover:border-navy"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => {
                      setPaymentMethod(method.value);
                      trackAddPaymentInfo(items, subtotal, method.value);
                    }}
                    className="sr-only"
                  />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-caption font-semibold text-ivory">
                    {method.initial}
                  </span>
                  {method.label}
                </label>
              ))}
            </div>

            {paymentMethod === "bkash" && paymentSettings?.bkash_number && (
              <p className="text-body text-charcoal/70">
                Send payment to bKash number{" "}
                <span className="font-semibold text-charcoal">{paymentSettings.bkash_number}</span>.
              </p>
            )}
            {paymentMethod === "nagad" && paymentSettings?.nagad_number && (
              <p className="text-body text-charcoal/70">
                Send payment to Nagad number{" "}
                <span className="font-semibold text-charcoal">{paymentSettings.nagad_number}</span>.
              </p>
            )}
            {paymentMethod === "rocket" && paymentSettings?.rocket_number && (
              <p className="text-body text-charcoal/70">
                Send payment to Rocket number{" "}
                <span className="font-semibold text-charcoal">{paymentSettings.rocket_number}</span>.
              </p>
            )}
            {paymentMethod === "cod" && (
              <p className="text-body text-charcoal/70">Pay when your order arrives.</p>
            )}
          </fieldset>
        </form>

        <aside className="lg:w-80">
          <div className="rounded-xl border border-linen p-6">
            <h2 className="font-serif text-charcoal text-h2">Order summary</h2>

            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between text-body text-charcoal/70">
                  <span>
                    {item.name}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} &times; {item.quantity}
                  </span>
                  <span className="whitespace-nowrap font-medium text-charcoal">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-linen pt-4 text-body text-charcoal/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-charcoal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium text-charcoal">
                  {deliveryFee === null ? "Calculated at address" : formatPrice(deliveryFee)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-linen pt-4 text-base font-semibold text-charcoal">
              <span>Total</span>
              <span>{formatPrice(subtotal + (deliveryFee ?? 0))}</span>
            </div>

            <div className="mt-6 flex items-center gap-4">
              {paymentSettings?.cod_enabled !== false && <Seal message="Cash on delivery" />}
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full flex-1 rounded-btn bg-burgundy px-4 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Placing your order..." : paymentMethod === "cod" ? CTA.order : "Place order"}
              </button>
            </div>

            <p className="mt-4 text-center text-caption text-stone">
              By placing this order you agree to our{" "}
              <Link href="/pages/terms" className="underline hover:text-navy">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/pages/returns" className="underline hover:text-navy">
                Return policy
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
