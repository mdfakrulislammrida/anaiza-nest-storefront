import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs } from "@/lib/api";
import { faqPageJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers to common questions about ordering, shipping, and returns.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getFaqs().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs)) }}
        />
      )}
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">FAQs</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">Frequently asked questions</h1>

      {faqs.length === 0 ? (
        <p className="mt-8 text-body text-stone">No questions here yet. If you need a hand, write to us on the Contact page.</p>
      ) : (
        <div className="mt-8 divide-y divide-linen border-t border-linen">
          {faqs.map((faq) => (
            <details key={faq.id} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-charcoal">
                {faq.question}
                <span className="ml-4 text-stone transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-charcoal/70">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
