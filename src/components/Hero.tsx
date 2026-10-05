"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { BRAND, CTA } from "@/lib/brand";
import { resolveWording } from "@/lib/homepageWording";
import GiftFrame from "./GiftFrame";
import PourLine from "./PourLine";

export default function Hero() {
  const wording = resolveWording(useSiteSettings().siteSettings);

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-0.5 px-0 sm:grid-cols-3">
      <div className="relative flex min-h-[26rem] flex-col justify-end gap-6 overflow-hidden bg-deepink p-8 text-ivory sm:col-span-2 sm:p-16">
        {/* The layout's gift frame and its one pour line. */}
        <GiftFrame />
        <PourLine className="right-8 sm:right-16" length="9rem" />

        {wording.hero_badge && (
          <span className="w-fit rounded-btn bg-ivory/10 px-4 py-1 text-caption text-champagne">{wording.hero_badge}</span>
        )}
        <h1 className="max-w-lg text-display">{wording.hero_title}</h1>
        {/* The layout's one italic line. */}
        <p className="max-w-md text-emotional text-champagne">{BRAND.supporting.secondCup}</p>
        <p className="max-w-md text-body text-ivory/80">{wording.hero_text}</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/shop?search=tea%20sets"
            className="rounded-btn bg-ivory px-8 py-4 text-button text-navy transition-opacity hover:opacity-90"
          >
            {CTA.shopTeaSets}
          </Link>
          <Link
            href="/gift-finder"
            className="rounded-btn border border-ivory/50 px-8 py-4 text-button text-ivory transition-colors hover:bg-ivory/10"
          >
            {CTA.findGift}
          </Link>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-0.5">
        <Link href="/hot-deals" className="relative flex min-h-[13rem] flex-col justify-end bg-navy p-6 text-ivory">
          <p className="font-serif text-h2">Special prices</p>
          <p className="mt-1 text-body text-ivory/80">{wording.hot_deals_tile_text} →</p>
        </Link>
        <Link href="/shop?sort=newest" className="relative flex min-h-[13rem] flex-col justify-end bg-charcoal p-6 text-ivory">
          <p className="font-serif text-h2">New arrivals</p>
          <p className="mt-1 text-body text-ivory/80">{wording.new_arrivals_tile_text} →</p>
        </Link>
      </div>
    </section>
  );
}
