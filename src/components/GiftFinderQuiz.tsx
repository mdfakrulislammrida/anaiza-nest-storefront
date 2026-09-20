"use client";

import { useState } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

const RECIPIENTS = ["A Close Friend", "Family Elder", "Partner / Spouse", "Colleague / Boss", "A New Baby"];
const OCCASIONS = ["Wedding", "Housewarming", "Birthday", "Just Because"];
const BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ৳1,500", max: 1500 },
  { label: "৳1,500 – ৳3,000", min: 1500, max: 3000 },
  { label: "৳3,000 – ৳5,000", min: 3000, max: 5000 },
  { label: "No limit — go premium", min: 5000 },
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
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy">Not sure what to choose?</p>
      <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Find Their Perfect Gift</h1>
      <p className="mt-2 text-sm text-muted">
        Three quick questions — we&rsquo;ll match you with something they&rsquo;ll actually love.
      </p>

      <div className="mt-10 text-left">
        {step !== 1 && step !== "results" && (
          <button
            type="button"
            onClick={() => setStep((step === 3 ? 2 : 1) as Step)}
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted hover:text-navy"
          >
            ← Back
          </button>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-xl text-ink">Who is this gift for?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {RECIPIENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setRecipient(option);
                    setStep(2);
                  }}
                  className="rounded-lg border border-line px-5 py-4 text-sm font-medium text-ink transition-colors hover:border-navy hover:bg-pill"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-xl text-ink">What&rsquo;s the occasion?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {OCCASIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setOccasion(option);
                    setStep(3);
                  }}
                  className="rounded-lg border border-line px-5 py-4 text-sm font-medium text-ink transition-colors hover:border-navy hover:bg-pill"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-center font-serif text-xl text-ink">What&rsquo;s your budget?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUDGETS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleBudgetSelect(option)}
                  disabled={loading}
                  className="rounded-lg border border-line px-5 py-4 text-sm font-medium text-ink transition-colors hover:border-navy hover:bg-pill disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-navy">Your matches</p>
            <h2 className="mt-1 text-center font-serif text-xl text-ink">
              Matched for {recipient} &middot; {occasion}
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              Based on your answers, these are the best fits in stock right now —
              every one within your budget.
            </p>

            {matches.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
                {matches.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-muted">
                No products matched that budget yet — try the full shop instead.
              </p>
            )}

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={retake}
                className="rounded-full border border-line px-8 py-3 text-sm font-medium text-ink hover:bg-pill"
              >
                Retake the Quiz
              </button>
              <Link
                href={`/shop?${new URLSearchParams({
                  ...(budget?.min ? { min_price: String(budget.min) } : {}),
                  ...(budget?.max ? { max_price: String(budget.max) } : {}),
                }).toString()}`}
                className="rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                See More Like These
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
