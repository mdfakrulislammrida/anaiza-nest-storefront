"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ApiError, createOrder, getPaymentSettings, validateCoupon } from "@/lib/api";
import { currentSessionToken, endSession, noteContact, noteStage } from "@/lib/checkoutSession";
import { clearCouponCode, clearRecoveryToken, readCouponCode, readRecoveryToken, saveCouponCode, type AppliedCoupon } from "@/lib/coupon";
import { mayStoreIdentified, validEmail, validPhone } from "@/lib/recovery";
import { resolveWhatsApp, whatsappLink } from "@/lib/whatsapp";
import { getStoredUtmParams } from "@/lib/attribution";
import { calmMessage, mobileProblem } from "@/lib/formGuard";
import { useFormGuard } from "./useFormGuard";
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
import WalletPaymentPanel from "./WalletPaymentPanel";
import { marketingAllowed } from "@/lib/consent";
import { isWalletMethod, normalizeBdNumber, walletFieldProblems, type WalletMethod } from "@/lib/payment";
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
  "gift_message",
  "payment_sender_number",
  "payment_trx_id",
  "coupon_code",
];

// Used only if an older API sends no steps of its own.
const DEFAULT_STEPS =
  "<ol><li>Send {{amount}} to {{number}}.</li><li>Copy the transaction ID from the confirmation message.</li><li>Enter the number you paid from and the transaction ID below, then place your order.</li></ol>";

function logoFor(settings: PaymentSetting | null, method: PaymentMethod): string | null {
  return method === "cod" || !settings ? null : (settings[`${method as WalletMethod}_logo`] ?? null);
}

export default function CheckoutForm({ paymentSettings: initialPaymentSettings }: { paymentSettings: PaymentSetting | null }) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  // The order summary shows a live estimate from the editable delivery settings;
  // the server always recomputes and charges the authoritative fee itself.
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
  const supportPhone = siteSettings?.contact_phone ?? null;
  const whatsapp = resolveWhatsApp(siteSettings);
  const whatsappHref = whatsappLink(whatsapp.number, whatsapp.message);
  const uid = useId();
  const guard = useFormGuard("order");
  const alertRef = useRef<HTMLDivElement>(null);

  // Seeded from the build, then refreshed once on load: a merchant number or step the shop has just changed
  // must never wait for a rebuild, because customers send real money to it.
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting | null>(initialPaymentSettings);

  useEffect(() => {
    let cancelled = false;
    getPaymentSettings()
      .then((fresh) => {
        if (!cancelled) setPaymentSettings(fresh);
      })
      .catch(() => {
        // Keep what the build had.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A wallet is offered only when the shop has published a number to pay to; cash on delivery unless switched off.
  const paymentMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((method) =>
        method.value === "cod"
          ? paymentSettings?.cod_enabled !== false
          : Boolean(paymentSettings?.[`${method.value}_number` as const]?.trim()),
      ),
    [paymentSettings],
  );

  // Dhaka is by far the most common destination -- preselected as a
  // convenience, but both stay one tap away from changing.
  const [division, setDivision] = useState<BdDivision | "">("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>(null);
  // The visitor's choice if it is still on offer, otherwise the first method that is.
  const paymentMethod: PaymentMethod | null =
    paymentMethods.find((method) => method.value === chosenMethod)?.value ?? paymentMethods[0]?.value ?? null;
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
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

  // A coupon: only the code is kept here. What it takes off is decided by the server, for the preview and again when the
  // order is placed.
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  // Whether the line about a reminder email is true: notice mode keeps identified carts; opt-in mode only once marketing is allowed.
  const [reminderMayBeSent, setReminderMayBeSent] = useState(true);

  useEffect(() => {
    const update = () => setReminderMayBeSent(mayStoreIdentified(window.anaizaConsent?.optIn === true, marketingAllowed()));
    update();
    window.addEventListener("anaiza:consent", update);
    return () => window.removeEventListener("anaiza:consent", update);
  }, []);

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

  useEffect(() => {
    noteStage("checkout_started");
  }, []);

  // Details from a reminder's link start the form filled in (only fields still empty), and its coupon is checked. The cart
  // is read from storage after the first render, so this waits until there is a cart (and so a form) to fill.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || items.length === 0) return;
    startedRef.current = true;

    try {
      const raw = window.sessionStorage.getItem("anaiza-recovered-contact");
      if (raw) {
        const saved = JSON.parse(raw) as { name?: string | null; email?: string | null; phone?: string | null };
        const form = document.getElementById("checkout-form") as HTMLFormElement | null;
        const fill = (field: string, value: string | null | undefined) => {
          const input = form?.elements.namedItem(field) as HTMLInputElement | null;
          if (input && value && input.value === "") input.value = value;
        };
        fill("customer_name", saved.name);
        fill("customer_email", saved.email);
        fill("customer_phone", saved.phone);
      }
    } catch {
      // Checkout simply starts empty.
    }

    const stored = readCouponCode();
    if (stored) {
      // One-time sync from storage on mount -- window is unavailable during the static render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCouponInput(stored);
      void applyCoupon(stored, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the cart first has something in it
  }, [items.length]);

  // The cart changed after a code was applied: ask again, so the figure shown is the server's.
  useEffect(() => {
    if (coupon) void applyCoupon(coupon.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the cart's value only
  }, [subtotal]);

  function contactFromForm() {
    const form = document.getElementById("checkout-form") as HTMLFormElement | null;
    const data = form ? new FormData(form) : null;

    return {
      name: String(data?.get("customer_name") ?? ""),
      email: String(data?.get("customer_email") ?? ""),
      phone: String(data?.get("customer_phone") ?? ""),
      whatsappOptIn: data?.get("whatsapp_optin") === "on",
    };
  }

  // A field was left. Only a complete, valid email or phone number is passed on; nothing is sent from here directly.
  function handleContactBlur() {
    const contact = contactFromForm();
    noteContact({
      name: contact.name,
      email: validEmail(contact.email),
      phone: validPhone(contact.phone),
      whatsappOptIn: contact.whatsappOptIn,
    });
  }

  async function applyCoupon(code: string, quiet = false) {
    const trimmed = code.trim();
    if (trimmed === "" || items.length === 0) return;

    const contact = contactFromForm();
    setCouponBusy(true);
    if (!quiet) setCouponError(null);

    try {
      const preview = await validateCoupon({
        code: trimmed,
        email: validEmail(contact.email),
        phone: validPhone(contact.phone),
        items: items.map((item) => ({ product_id: item.productId, variant_id: item.variantId, quantity: item.quantity })),
      });
      setCoupon({ code: preview.code, value_label: preview.value_label, discount: preview.discount, valid_until_text: preview.valid_until_text });
      saveCouponCode(preview.code);
      setCouponError(null);
    } catch (error) {
      setCoupon(null);
      if (error instanceof ApiError && error.status === 422) {
        setCouponError(error.message);
        clearCouponCode();
      } else if (!quiet) {
        setCouponError("We could not check that code just now. Please try again in a moment.");
      }
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
    clearCouponCode();
  }

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

    if (!paymentMethod) {
      setFormError("There is no way to pay online just now. Please contact us and we will help you order.");
      setRevealCount((count) => count + 1);
      return;
    }

    const form = new FormData(formElement);

    // Caught here, in words that say what a number looks like, rather than after the order is sent.
    const phoneProblem = mobileProblem(String(form.get("customer_phone") ?? ""));
    if (phoneProblem) {
      setFieldErrors({ customer_phone: [phoneProblem] });
      setFormError("Please check the highlighted fields and try again.");
      setRevealCount((count) => count + 1);
      return;
    }

    const senderNumber = String(form.get("payment_sender_number") ?? "");
    const trxId = String(form.get("payment_trx_id") ?? "");

    // A wallet payment is checked against the number and transaction ID, so a typo is caught here, not after the order.
    if (isWalletMethod(paymentMethod)) {
      const problems = walletFieldProblems(senderNumber, trxId);
      if (Object.keys(problems).length > 0) {
        setFieldErrors(problems);
        setFormError("Please check the highlighted fields and try again.");
        setRevealCount((count) => count + 1);
        return;
      }
    }

    setSubmitting(true);
    const email = String(form.get("customer_email") ?? "").trim();

    // Waits out the bot trap's minimum time (invisibly, with the button already busy), then carries its two fields.
    const proof = await guard.proof();

    const payload: CreateOrderPayload = {
      ...proof,
      customer_name: String(form.get("customer_name") ?? ""),
      customer_email: email || null,
      customer_phone: String(form.get("customer_phone") ?? ""),
      customer_address: String(form.get("customer_address") ?? ""),
      division,
      district,
      thana,
      payment_method: paymentMethod,
      ...(isWalletMethod(paymentMethod)
        ? { payment_sender_number: normalizeBdNumber(senderNumber.trim()), payment_trx_id: trxId.trim().toUpperCase() }
        : {}),
      gift_note: String(form.get("gift_note") ?? "") || null,
      is_gift: isGift,
      marketing_consent: marketingAllowed(),
      gift_message: isGift ? giftMessage.trim() || null : null,
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
      })),
      ...getStoredUtmParams(),
      ...(coupon ? { coupon_code: coupon.code } : {}),
      ...(currentSessionToken() ? { checkout_session: currentSessionToken() as string } : {}),
    };

    // An order that came back through a reminder says so (the server marks it from the token as well).
    const recoveryToken = readRecoveryToken();
    if (recoveryToken) {
      payload.recovery_token = recoveryToken;
      payload.utm_source = "cart_recovery";
      payload.utm_medium = "email";
      payload.utm_campaign = "abandoned_cart";
    }

    try {
      const order = await createOrder(payload);
      window.sessionStorage.setItem("anaiza-last-order", JSON.stringify(order));
      setOrderPlaced(true);
      endSession();
      clearCouponCode();
      clearRecoveryToken();
      clearCart();
      router.push("/order-confirmation");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setFieldErrors(error.errors);
        if (error.errors.coupon_code) {
          setCoupon(null);
          setCouponError(error.errors.coupon_code[0]);
          clearCouponCode();
        }
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
        setFormError(calmMessage(error, "Sorry, we could not place your order just now. Please try again in a moment."));
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
        <form id="checkout-form" onSubmit={handleSubmit} onBlur={handleContactBlur} className="relative flex-1 space-y-8">
          {guard.trap}
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
              {(supportPhone || whatsappHref) && (
                <p className="mt-4">
                  Need a hand?{" "}
                  {supportPhone && (
                    <>
                      Call{" "}
                      <a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="font-medium underline">
                        {supportPhone}
                      </a>
                    </>
                  )}
                  {supportPhone && whatsappHref && " or "}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noreferrer noopener" className="font-medium underline">
                      {supportPhone ? "message us on WhatsApp" : "Message us on WhatsApp"}
                    </a>
                  )}
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
              {reminderMayBeSent && (
                <p className="mt-2 text-caption text-stone">
                  If you leave without ordering, we may email you a reminder. You can unsubscribe any time.
                </p>
              )}
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-charcoal">
              <input type="checkbox" name="whatsapp_optin" onChange={handleContactBlur} className="h-5 w-5 accent-navy" />
              Send me updates and offers on WhatsApp
            </label>

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
                Order notes (optional)
              </label>
              <textarea id={`${uid}-notes`} name="gift_note" rows={3} autoComplete="off" className={inputClass} />
              {errorFor("gift_note")}
            </div>

            <div className="rounded-btn border border-linen bg-linen/50 p-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-medium text-charcoal">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(event) => setIsGift(event.target.checked)}
                  className="h-5 w-5 accent-navy"
                />
                This is a gift
              </label>
              <p className="text-caption text-stone">Free, and it does not change your total.</p>
              {isGift && (
                <div className="mt-3">
                  <label htmlFor={`${uid}-gift`} className={labelClass}>
                    Gift message (optional)
                  </label>
                  <textarea
                    id={`${uid}-gift`}
                    name="gift_message"
                    rows={3}
                    maxLength={200}
                    value={giftMessage}
                    onChange={(event) => setGiftMessage(event.target.value)}
                    autoComplete="off"
                    className={inputClass}
                  />
                  <p className="mt-1 text-right text-caption text-stone" aria-live="polite">
                    {giftMessage.length}/200
                  </p>
                  {errorFor("gift_message")}
                </div>
              )}
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
                      setChosenMethod(method.value);
                      trackAddPaymentInfo(items, subtotal, method.value);
                    }}
                    className="sr-only"
                  />
                  {logoFor(paymentSettings, method.value) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized.
                    <img src={logoFor(paymentSettings, method.value) ?? undefined} alt="" height={28} loading="lazy" decoding="async" className="h-7 w-auto" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-caption font-semibold text-ivory">
                      {method.initial}
                    </span>
                  )}
                  {method.label}
                </label>
              ))}
            </div>

            {paymentMethods.length === 0 && (
              <p className="text-body text-charcoal/70">
                There is no way to pay online just now. Please{" "}
                <Link href="/contact" className="underline hover:text-navy">
                  contact us
                </Link>{" "}
                and we will help you order.
              </p>
            )}
            {paymentMethod && isWalletMethod(paymentMethod) && paymentSettings && (
              <WalletPaymentPanel
                key={paymentMethod}
                method={paymentMethod}
                label={PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.label ?? paymentMethod}
                number={(paymentSettings[`${paymentMethod}_number`] ?? "").trim()}
                amount={deliveryFee === null ? null : subtotal - (coupon?.discount ?? 0) + deliveryFee}
                instructionsHtml={paymentSettings[`${paymentMethod}_instructions`] || DEFAULT_STEPS}
                logo={logoFor(paymentSettings, paymentMethod)}
                errors={fieldErrors}
              />
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
              {coupon && (
                <div className="flex justify-between">
                  <span>Code {coupon.code}</span>
                  <span className="font-medium text-charcoal">&minus;{formatPrice(coupon.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium text-charcoal">
                  {deliveryFee === null ? "Calculated at address" : formatPrice(deliveryFee)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-linen pt-4 text-base font-semibold text-charcoal">
              <span>Total</span>
              <span>{formatPrice(Math.max(0, subtotal - (coupon?.discount ?? 0)) + (deliveryFee ?? 0))}</span>
            </div>

            <div className="mt-6">
              {coupon ? (
                <div className="rounded-btn border border-linen bg-linen/60 p-3 text-body text-charcoal">
                  <p>
                    <span className="font-medium">{coupon.code}</span> is applied: {coupon.value_label} off
                    {coupon.valid_until_text ? `, until ${coupon.valid_until_text}` : ""}.
                  </p>
                  <button type="button" onClick={removeCoupon} className="mt-1 min-h-11 text-caption font-medium text-navy underline">
                    Remove code
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor={`${uid}-coupon`} className={labelClass}>
                    Have a code?
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id={`${uid}-coupon`}
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void applyCoupon(couponInput);
                        }
                      }}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-invalid={couponError ? true : undefined}
                      className="w-full min-w-0 rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon(couponInput)}
                      disabled={couponBusy || couponInput.trim() === ""}
                      className="min-h-11 shrink-0 rounded-btn bg-navy px-5 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {couponBusy ? "Checking..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p role="alert" className="mt-1 text-caption text-burgundy">
                      {couponError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-4">
              {paymentSettings?.cod_enabled !== false && <Seal message="Cash on delivery" />}
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || !guard.ready}
                className="w-full flex-1 scroll-mb-[calc(var(--cookie-top,0px)+1rem)] rounded-btn bg-burgundy px-4 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
