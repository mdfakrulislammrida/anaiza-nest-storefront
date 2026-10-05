"use client";

import { useState } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import { CTA } from "@/lib/brand";
import type { Product } from "@/lib/types";

const RECIPIENTS = ["A close friend", "A family elder", "Partner or spouse", "Colleague or boss", "A new baby"];
const OCCASIONS = ["Wedding", "Housewarming", "Birthday", "Just because"];
const BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ৳1,500", max: 1500 },
  { label: "৳1,500 – ৳3,000", min: 1500, max: 3000 },
  { label: "৳3,000 – ৳5,000", min: 3000, max: 5000 },
  { label: "No limit", min: 5000 },
];

type Step = 1 | 2 | 3 | "results";

export default function GiftFinderQuiz() {
  const [step, setStep] = useState<Step>(1);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [budget, setBudget] = useState<(typeof BUDGETS)[number] | null>(null);
  const [matches, setMatches] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleBudgetSelect(selected: (typeof BUDGETS)[number]) {
    setBudget(selected);
    setLoading(true);
    try {
      const res = await getProducts({ min_price: selected.min, max_price: selected.max, per_page: 6 });
      setMatches(res.data);
    } finally {
      setLoading(false);
      setStep("results");
    }
  }

  function retake() {
    setStep(1);
    setRecipient(null);
    setOccasion(null);
    setBudget(null);
    setMatches([]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-caption font-semibold text-navy">Not sure what to give?</p>
      <h1 className="mt-2 font-serif text-charcoal text-h1">{CTA.findGift}</h1>
      <p className="mt-2 text-body text-stone">
        Three quick questions, then a few thoughtful ideas.
      </p>

      <div className="mt-10 text-left">
        {step !== 1 && step !== "results" && (
          <button
            type="button"
            onClick={() => setStep((step === 3 ? 2 : 1) as Step)}
            className="mb-4 text-caption font-semibold text-stone hover:text-navy"
          >
            ← Back
          </button>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-charcoal text-h2">Who is this gift for?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {RECIPIENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setRecipient(option);
                    setStep(2);
                  }}
                  className="rounded-btn border border-stone/80 px-6 py-4 text-button text-charcoal transition-colors hover:border-navy hover:bg-linen"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-charcoal text-h2">What&rsquo;s the occasion?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {OCCASIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setOccasion(option);
                    setStep(3);
                  }}
                  className="rounded-btn border border-stone/80 px-6 py-4 text-button text-charcoal transition-colors hover:border-navy hover:bg-linen"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-charcoal text-h2">What&rsquo;s your budget?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {BUDGETS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleBudgetSelect(option)}
                  disabled={loading}
                  className="rounded-btn border border-stone/80 px-6 py-4 text-button text-charcoal transition-colors hover:border-navy hover:bg-linen disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <p className="text-center text-caption font-semibold text-navy">Your matches</p>
            <h2 className="mt-1 text-center font-serif text-charcoal text-h2">
              Matched for {recipient} &middot; {occasion}
            </h2>
            <p className="mt-2 text-center text-body text-stone">
              Based on your answers: pieces in stock now, all within your budget.
            </p>

            {matches.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
                {matches.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-center text-body text-stone">
                Nothing in the shop matches that budget just yet. Have a look at the full shop, or message us and we will help you choose.
              </p>
            )}

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={retake}
                className="rounded-btn border border-stone/80 px-8 py-4 text-button text-charcoal hover:bg-linen"
              >
                Start again
              </button>
              <Link
                href={`/shop?${new URLSearchParams({
                  ...(budget?.min ? { min_price: String(budget.min) } : {}),
                  ...(budget?.max ? { max_price: String(budget.max) } : {}),
                }).toString()}`}
                className="rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
              >
                See more like these
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
