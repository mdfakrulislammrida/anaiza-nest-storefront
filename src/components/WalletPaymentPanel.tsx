"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/format";
import { fillInstructions, type WalletMethod } from "@/lib/payment";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 min-h-12 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-3 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-medium text-stone";

// What a customer sees after choosing bKash, Nagad or Rocket: the number to pay (with a copy button), the
// exact amount, the admin's numbered steps, and the two fields we check the payment against. It sits inside
// the checkout form, so its fields are read with the rest of the form when the order is placed.
export default function WalletPaymentPanel({
  method,
  label,
  number,
  amount,
  instructionsHtml,
  logo,
  errors,
}: {
  method: WalletMethod;
  label: string;
  number: string;
  amount: number | null;
  instructionsHtml: string;
  logo: string | null;
  errors: Record<string, string[]>;
}) {
  const uid = useId();
  const [copied, setCopied] = useState(false);
  const amountText = amount === null ? null : formatPrice(amount);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number is still on screen, selectable with one tap.
    }
  }

  const senderError = errors.payment_sender_number?.[0];
  const trxError = errors.payment_trx_id?.[0];

  return (
    <div className="space-y-5 rounded-btn border border-linen bg-linen/50 p-4 sm:p-5" data-wallet-panel={method}>
      <div className="flex items-center gap-3">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized.
          <img src={logo} alt="" height={28} loading="lazy" decoding="async" className="h-7 w-auto" />
        )}
        <h3 className="font-serif text-body font-semibold text-charcoal">Pay with {label}</h3>
      </div>

      <div>
        <p className={labelClass}>{label} number to pay</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="select-all text-h2 font-semibold tracking-wide text-charcoal">{number}</p>
          <button
            type="button"
            onClick={copyNumber}
            className="min-h-11 rounded-btn border border-stone/80 px-4 text-button text-charcoal transition-colors hover:border-navy"
          >
            {copied ? "Copied" : "Copy number"}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Number copied" : ""}
          </span>
        </div>
      </div>

      <div>
        <p className={labelClass}>Amount to send</p>
        <p className="mt-1 text-h2 font-semibold text-charcoal">
          {amountText ?? "Choose your division to see it"}
        </p>
        {amountText && <p className="text-caption text-stone">Items and delivery, exactly this amount.</p>}
      </div>

      <div
        className="text-body leading-relaxed text-charcoal/80 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: fillInstructions(instructionsHtml, amountText, number) }}
      />

      <div>
        <label htmlFor={`${uid}-sender`} className={labelClass}>
          The number you paid from
        </label>
        <input
          id={`${uid}-sender`}
          name="payment_sender_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          required
          aria-invalid={senderError ? true : undefined}
          className={inputClass}
        />
        {senderError && <p className="mt-1 text-caption text-burgundy">{senderError}</p>}
      </div>

      <div>
        <label htmlFor={`${uid}-trx`} className={labelClass}>
          Transaction ID
        </label>
        <input
          id={`${uid}-trx`}
          name="payment_trx_id"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          placeholder="From your payment message"
          required
          aria-invalid={trxError ? true : undefined}
          className={`${inputClass} uppercase placeholder:normal-case`}
        />
        {trxError && <p className="mt-1 text-caption text-burgundy">{trxError}</p>}
        <p className="mt-1 text-caption text-stone">6 to 20 letters and digits.</p>
      </div>
    </div>
  );
}
