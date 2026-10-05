"use client";

import { useState, type FormEvent } from "react";
import { ApiError, submitContactForm } from "@/lib/api";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-semibold text-stone";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await submitContactForm({
        name: String(data.get("name") ?? ""),
        phone: String(data.get("phone") ?? ""),
        message: String(data.get("message") ?? ""),
      });
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Sorry, that did not go through. Please try again in a moment.");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-btn border border-linen bg-linen p-6 text-body text-charcoal">
        Thank you. We have your message and will reply soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Name</label>
        <input name="name" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input name="phone" type="tel" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Message</label>
        <textarea name="message" rows={5} required className={inputClass} />
      </div>
      {error && <p className="text-body text-burgundy">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
