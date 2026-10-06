"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError, submitCorporateEnquiry } from "@/lib/api";
import { CTA } from "@/lib/brand";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-semibold text-stone";

export default function CorporateEnquiryForm() {
  const uid = useId();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function errorFor(field: string) {
    const message = fieldErrors[field]?.[0];
    return message ? <p className="mt-1 text-caption text-burgundy">{message}</p> : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    try {
      await submitCorporateEnquiry({
        name: text("name"),
        company: text("company"),
        phone: text("phone"),
        email: text("email"),
        quantity: Number(text("quantity")),
        needed_by: text("needed_by") || null,
        products_of_interest: text("products_of_interest") || null,
        message: text("message") || null,
        // The bot trap: a field people never see. Anything typed in it is discarded by the server.
        website: String(data.get("website") ?? ""),
      });
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        setError("Please check the highlighted fields and try again.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Too many enquiries from this connection just now. Please try again later, or call us.");
      } else {
        setError("Sorry, that did not go through. Please try again in a moment.");
      }
    }
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-btn border border-linen bg-linen p-6 text-body text-charcoal">
        Thank you. We have your enquiry and will be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            Your name
          </label>
          <input id={`${uid}-name`} name="name" required autoComplete="name" className={inputClass} />
          {errorFor("name")}
        </div>
        <div>
          <label htmlFor={`${uid}-company`} className={labelClass}>
            Company
          </label>
          <input id={`${uid}-company`} name="company" required autoComplete="organization" className={inputClass} />
          {errorFor("company")}
        </div>
        <div>
          <label htmlFor={`${uid}-phone`} className={labelClass}>
            Phone
          </label>
          <input id={`${uid}-phone`} name="phone" type="tel" required autoComplete="tel" className={inputClass} />
          {errorFor("phone")}
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelClass}>
            Email
          </label>
          <input id={`${uid}-email`} name="email" type="email" required autoComplete="email" className={inputClass} />
          {errorFor("email")}
        </div>
        <div>
          <label htmlFor={`${uid}-quantity`} className={labelClass}>
            Quantity
          </label>
          <input
            id={`${uid}-quantity`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            className={inputClass}
          />
          {errorFor("quantity")}
        </div>
        <div>
          <label htmlFor={`${uid}-needed`} className={labelClass}>
            Needed by (optional)
          </label>
          <input id={`${uid}-needed`} name="needed_by" type="date" className={inputClass} />
          {errorFor("needed_by")}
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-products`} className={labelClass}>
          Products of interest (optional)
        </label>
        <textarea id={`${uid}-products`} name="products_of_interest" rows={3} maxLength={1000} className={inputClass} />
        {errorFor("products_of_interest")}
      </div>

      <div>
        <label htmlFor={`${uid}-message`} className={labelClass}>
          Message (optional)
        </label>
        <textarea id={`${uid}-message`} name="message" rows={4} maxLength={2000} className={inputClass} />
        {errorFor("message")}
      </div>

      {/* Honeypot. Off screen and out of the tab order, so a person never meets it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this field empty
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-body text-burgundy">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {status === "loading" ? "Sending..." : CTA.corporate}
      </button>
    </form>
  );
}
