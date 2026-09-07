"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/types";

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[index];
  if (!banner) return null;

  return (
    <section className="relative overflow-hidden border-b border-ink/10 bg-ink">
      <div className="relative flex min-h-[420px] items-center sm:min-h-[520px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, not in next/image's allowed hosts */}
        <img
          src={banner.image_url}
          alt={banner.headline ?? ""}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24">
          {banner.headline && (
            <h1 className="max-w-2xl font-serif text-4xl leading-tight text-ivory sm:text-6xl">
              {banner.headline}
            </h1>
          )}
          {banner.subtext && (
            <p className="max-w-lg text-base leading-relaxed text-ivory/80">
              {banner.subtext}
            </p>
          )}
          <Link
            href={banner.link || "/shop"}
            className="mt-4 inline-flex items-center justify-center bg-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-burgundy hover:text-ivory"
          >
            Shop now
          </Link>
        </div>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-6 transition-colors ${
                i === index ? "bg-gold" : "bg-ivory/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
