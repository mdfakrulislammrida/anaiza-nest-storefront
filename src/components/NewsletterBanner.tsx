"use client";

import { useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "@/lib/api";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveWording } from "@/lib/homepageWording";

export default function NewsletterBanner({
  title,
  subtitle,
}: {
  // From the homepage section in the admin; blank falls back to the site-wide newsletter wording.
  title?: string | null;
  subtitle?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const wording = resolveWording(useSiteSettings().siteSettings);

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
    <section className="bg-navy text-ivory">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-serif text-h2">{title || wording.newsletter_headline}</h2>
        <p className="mt-2 text-body text-ivory/70">{subtitle || wording.newsletter_text}</p>

        {status === "done" ? (
          <p className="mt-6 text-body font-medium">Thanks — you&apos;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-sm gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-btn border border-ivory/20 bg-ivory/10 px-4 py-2 text-base text-ivory placeholder:text-ivory/50 focus:border-ivory focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-btn bg-ivory px-6 py-2 text-button text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Subscribe
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-2 text-caption text-champagne">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}
