import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs } from "@/lib/api";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers to common questions about ordering, shipping, and returns.",
};

export default async function FaqPage() {
  const faqs = await getFaqs().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">FAQs</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Frequently Asked Questions</h1>

      {faqs.length === 0 ? (
        <p className="mt-8 text-muted">Nothing here yet — check back soon.</p>
      ) : (
        <div className="mt-8 divide-y divide-line border-t border-line">
          {faqs.map((faq) => (
            <details key={faq.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-ink">
                {faq.question}
                <span className="ml-4 text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
