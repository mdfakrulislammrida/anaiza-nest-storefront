"use client";

import { useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "@/lib/api";

export default function NewsletterBanner() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    if (!email) return;

    setStatus("loading");
    try {
      await subscribeToNewsletter(email);
      setStatus("done");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-serif text-2xl sm:text-3xl">Get 10% off your first order</h2>
        <p className="mt-2 text-sm text-white/70">
          Join our list for early access to hot deals and new arrivals.
        </p>

        {status === "done" ? (
          <p className="mt-6 text-sm font-medium">Thanks — you&apos;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-sm gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-base text-white placeholder:text-white/50 focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Subscribe
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-2 text-xs text-red-200">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}
