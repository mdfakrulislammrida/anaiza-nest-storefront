import type { Metadata } from "next";
import { getFaqs } from "@/lib/api";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering, shipping, and returns.",
};

export default async function FaqPage() {
  const faqs = await getFaqs().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">FAQ</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Frequently asked questions</h1>

      {faqs.length === 0 ? (
        <p className="mt-8 text-ink/60">Nothing here yet — check back soon.</p>
      ) : (
        <div className="mt-10 divide-y divide-ink/10 border-t border-ink/10">
          {faqs.map((faq) => (
            <details key={faq.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-lg text-ink">
                {faq.question}
                <span className="ml-4 text-gold transition-transform group-open:rotate-45">
                  +
                </span>
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
