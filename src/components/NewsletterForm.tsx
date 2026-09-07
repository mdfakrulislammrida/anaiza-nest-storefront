"use client";

import { useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "@/lib/api";

export default function NewsletterForm() {
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

  if (status === "done") {
    return <p className="mt-4 text-sm text-gold">Thanks — you&apos;re on the list.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-xs gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="Your email"
        className="min-w-0 flex-1 border border-ivory/20 bg-transparent px-3 py-2 text-sm text-ivory placeholder:text-ivory/40 focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="shrink-0 bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-burgundy hover:text-ivory disabled:cursor-not-allowed disabled:opacity-60"
      >
        Join
      </button>
      {status === "error" && (
        <p className="mt-1 basis-full text-xs text-burgundy">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
