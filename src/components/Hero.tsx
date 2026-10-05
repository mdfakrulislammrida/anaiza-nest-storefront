"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveWording } from "@/lib/homepageWording";

export default function Hero() {
  const wording = resolveWording(useSiteSettings().siteSettings);

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-0.5 px-0 sm:grid-cols-3">
      <div className="relative flex min-h-[420px] flex-col justify-end gap-6 overflow-hidden bg-gradient-to-br from-[#7a5a5f] via-[#3d2b30] to-[#16161A] p-8 text-white sm:col-span-2 sm:p-12">
        {wording.hero_badge && (
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{wording.hero_badge}</span>
        )}
        <h1 className="max-w-md font-serif text-4xl leading-tight sm:text-5xl">{wording.hero_title}</h1>
        <p className="max-w-md text-sm text-white/80">{wording.hero_text}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Shop all gifts →
          </Link>
          <Link
            href="/hot-deals"
            className="rounded-full border border-white/40 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            View hot deals
          </Link>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-0.5">
        <Link
          href="/hot-deals"
          className="relative flex min-h-[208px] flex-col justify-end bg-gradient-to-br from-gray-500 to-black p-6 text-white"
        >
          <p className="font-serif text-xl">Hot Deals</p>
          <p className="mt-1 text-sm text-white/80">{wording.hot_deals_tile_text} →</p>
        </Link>
        <Link
          href="/shop?sort=newest"
          className="relative flex min-h-[208px] flex-col justify-end bg-gradient-to-br from-[#7c8a6a] to-[#2f3527] p-6 text-white"
        >
          <p className="font-serif text-xl">New Arrivals</p>
          <p className="mt-1 text-sm text-white/80">{wording.new_arrivals_tile_text} →</p>
        </Link>
      </div>
    </section>
  );
}
