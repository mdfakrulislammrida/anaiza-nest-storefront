import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "The story and approach behind Anaiza.",
};

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            About
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
            Made to be kept, not replaced.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Anaiza started as a small collection of ceramics and gifting sets,
            chosen and finished with the belief that everyday objects deserve
            the same care as anything else in your home.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 sm:grid-cols-3">
          <div>
            <p className="font-serif text-2xl text-burgundy">01</p>
            <h2 className="mt-3 font-serif text-xl text-ink">Sourced with care</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Every piece is chosen from small workshops and makers, favoring
              craft over volume.
            </p>
          </div>
          <div>
            <p className="font-serif text-2xl text-burgundy">02</p>
            <h2 className="mt-3 font-serif text-xl text-ink">Finished by hand</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Gift sets are packed and finished individually, so every order
              feels considered rather than mass-produced.
            </p>
          </div>
          <div>
            <p className="font-serif text-2xl text-burgundy">03</p>
            <h2 className="mt-3 font-serif text-xl text-ink">Built to last</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              We choose materials and forms that hold up to daily use, not
              just first impressions.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-ink text-ivory">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="font-serif text-3xl">Explore the current collection</h2>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center bg-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-burgundy hover:text-ivory"
          >
            Shop now
          </Link>
        </div>
      </section>
    </div>
  );
}
