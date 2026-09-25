"use client";

import { useState, type FormEvent } from "react";
import { ApiError, submitContactForm } from "@/lib/api";

// text-base (not text-sm): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-sm's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base text-ink focus:border-navy focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-muted";

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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-lg border border-line bg-pill p-6 text-sm text-ink">
        Thanks — we&rsquo;ll get back to you shortly.
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
