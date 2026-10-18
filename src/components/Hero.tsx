"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { BRAND, CTA } from "@/lib/brand";
import { resolveWording } from "@/lib/homepageWording";
import {
  HERO_MOBILE_SIZES,
  HERO_OVERLAY_CLASS,
  HERO_SIZES,
  TILE_OVERLAY_CLASS,
  TILE_SIZES,
  heroLoading,
  resolveHomepagePictures,
  type HeroPictures,
  type TilePicture,
} from "@/lib/homepagePictures";
import type { BannerSlider } from "@/lib/types";
import GiftFrame from "./GiftFrame";
import HeroSlider from "./HeroSlider";
import PourLine from "./PourLine";

// With live slides the slider sits above the hero; without any, the hero is exactly what it was. The gift frame and the one
// pour line are the hero's, so the slider carries neither.
export default function Hero({ slider = null }: { slider?: BannerSlider | null }) {
  const { siteSettings } = useSiteSettings();
  const wording = resolveWording(siteSettings);
  const pictures = resolveHomepagePictures(siteSettings);
  const sliderIsLive = Boolean(slider && slider.slides.length > 0);

  return (
    <>
      {slider && sliderIsLive && <HeroSlider slides={slider.slides} settings={slider.settings} />}
      <HeroPanel wording={wording} pictures={pictures} sliderIsLive={sliderIsLive} />
    </>
  );
}

function HeroPanel({
  wording,
  pictures,
  sliderIsLive,
}: {
  wording: ReturnType<typeof resolveWording>;
  pictures: ReturnType<typeof resolveHomepagePictures>;
  sliderIsLive: boolean;
}) {
  const picture = pictures.hero;

  // The words, the same with or without a picture.
  const words = (
    <>
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
    </>
  );

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-0.5 px-0 sm:grid-cols-3">
      {picture ? (
        <HeroWithPicture picture={picture} sliderIsLive={sliderIsLive}>
          {words}
        </HeroWithPicture>
      ) : (
        <div className="relative flex min-h-[26rem] flex-col justify-end gap-6 overflow-hidden bg-deepink p-8 text-ivory sm:col-span-2 sm:p-16">
          {/* The layout's gift frame and its one pour line. */}
          <GiftFrame />
          <PourLine className="right-8 sm:right-16" length="9rem" />
          {words}
        </div>
      )}

      <div className="grid grid-rows-2 gap-0.5">
        <Tile
          href="/hot-deals"
          background="bg-navy"
          title="Special prices"
          text={wording.hot_deals_tile_text}
          picture={pictures.hotDealsTile}
        />
        <Tile
          href="/shop?sort=newest"
          background="bg-charcoal"
          title="New arrivals"
          text={wording.new_arrivals_tile_text}
          picture={pictures.newArrivalsTile}
        />
      </div>
    </section>
  );
}

// The hero with a photograph. The picture fills the panel (object-fit: cover, from the centre: the shop never crops it). The
// text sits on a flat deepink panel: the left side on a wide screen, the lower part on a phone, so the photograph's subject
// belongs on the right (wide) or at the top (phone). The gift frame and the pour line are drawn last, so they stay on top,
// in gold, which shows on a bright photograph as well as a dark one.
function HeroWithPicture({
  picture,
  sliderIsLive,
  children,
}: {
  picture: HeroPictures;
  sliderIsLive: boolean;
  children: ReactNode;
}) {
  const { desktop, mobile } = picture;
  const { loading, fetchPriority } = heroLoading(sliderIsLive);

  return (
    <div className="relative flex min-h-[42rem] flex-col justify-end overflow-hidden bg-deepink text-ivory sm:col-span-2 sm:min-h-[26rem]">
      <picture>
        {/* Under 640 px the phone's own picture, so it never fetches the desktop file. Without one, it uses the desktop picture. */}
        {mobile && <source media="(max-width: 639px)" srcSet={mobile.srcset} sizes={HERO_MOBILE_SIZES} />}
        <img
          src={desktop.src}
          srcSet={desktop.srcset}
          sizes={HERO_SIZES}
          width={desktop.width}
          height={desktop.height}
          alt={picture.alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      <div
        className={`relative flex flex-col gap-6 p-8 ${HERO_OVERLAY_CLASS} sm:absolute sm:inset-y-0 sm:left-0 sm:w-[min(100%,37rem)] sm:justify-end sm:p-16`}
      >
        {children}
      </div>

      {/* The layout's gift frame and its one pour line. */}
      <GiftFrame tone="gold" />
      <PourLine className="pour-line-gold right-8 sm:right-16" length="9rem" />
    </div>
  );
}

// A side tile. With a picture the text keeps its place and size, on a flat deepink panel along the bottom of the tile; the
// picture is lazy (it is not the first thing on the page).
function Tile({
  href,
  background,
  title,
  text,
  picture,
}: {
  href: string;
  background: string;
  title: string;
  text: string;
  picture: TilePicture | null;
}) {
  if (!picture) {
    return (
      <Link href={href} className={`relative flex min-h-[13rem] flex-col justify-end ${background} p-6 text-ivory`}>
        <p className="font-serif text-h2">{title}</p>{" "}
        <p className="mt-1 text-body text-ivory/80">{text} →</p>
      </Link>
    );
  }

  return (
    <Link href={href} className={`relative flex min-h-[13rem] flex-col justify-end overflow-hidden ${background} text-ivory`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized. */}
      <img
        src={picture.image.src}
        srcSet={picture.image.srcset}
        sizes={TILE_SIZES}
        width={picture.image.width}
        height={picture.image.height}
        alt={picture.alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className={`relative ${TILE_OVERLAY_CLASS} p-6`}>
        <p className="font-serif text-h2">{title}</p>{" "}
        <p className="mt-1 text-body text-ivory/80">{text} →</p>
      </div>
    </Link>
  );
}
