// The pictures behind the homepage hero panel and its two side tiles (Site Settings > Homepage pictures in the admin).
//
// They arrive in the site settings (homepage.images): the build ships a copy and the browser refreshes it silently, so a
// picture set in the admin shows without a rebuild. Each is optional; with none, the panels are the plain colour they were.
// What is read from the settings is checked before it is used (an older API sends none, and anything odd is ignored).

import type { HomepagePictureSet, SiteSetting } from "./types";

// A flat deepink fill (no gradient) behind the text, as opaque as the worst photograph needs. Measured against pure white,
// the brightest photograph there can be, with every piece of text on the panel:
//   hero 0.90: headline 10.9:1, paragraph 7.6:1, italic line 6.4:1, badge 4.8:1 (the lowest; below 0.88 it fails 4.5:1)
//   tile 0.78: heading 7.2:1, paragraph 5.3:1 (below 0.74 the paragraph fails 4.5:1)
// signatureSource tests the numbers; these are the Tailwind classes that carry them (kept literal so Tailwind finds them).
export const HERO_OVERLAY_OPACITY = 0.9;
export const TILE_OVERLAY_OPACITY = 0.78;
export const HERO_OVERLAY_CLASS = "bg-deepink/90";
export const TILE_OVERLAY_CLASS = "bg-deepink/[0.78]";

// The hero panel is two thirds of the page from 640 px, at most 843 px (the page is 1280 wide at most); a tile is a third.
export const HERO_SIZES = "(min-width: 1280px) 843px, (min-width: 640px) 67vw, 100vw";
export const HERO_MOBILE_SIZES = "100vw";
export const TILE_SIZES = "(min-width: 1280px) 427px, (min-width: 640px) 34vw, 100vw";

export interface HeroPictures {
  desktop: HomepagePictureSet;
  mobile: HomepagePictureSet | null;
  // Empty means the picture is decoration (alt=""); it is never filled in from the headline.
  alt: string;
}

export interface TilePicture {
  image: HomepagePictureSet;
  alt: string;
}

export interface HomepagePictures {
  hero: HeroPictures | null;
  hotDealsTile: TilePicture | null;
  newArrivalsTile: TilePicture | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** One picture as the API describes it, or null if anything about it is missing or wrong. */
export function pictureSet(value: unknown): HomepagePictureSet | null {
  if (!isRecord(value)) return null;

  const { src, srcset, width, height } = value;

  if (typeof src !== "string" || !/^https?:\/\//.test(src)) return null;
  if (typeof srcset !== "string" || srcset.trim() === "") return null;
  if (!isSize(width) || !isSize(height)) return null;

  return { src, srcset, width, height };
}

function altText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

export function resolveHomepagePictures(siteSettings: SiteSetting | null): HomepagePictures {
  const images: unknown = siteSettings?.homepage?.images;
  const none: HomepagePictures = { hero: null, hotDealsTile: null, newArrivalsTile: null };

  if (!isRecord(images)) return none;

  const heroRaw = isRecord(images.hero) ? images.hero : {};
  const desktop = pictureSet(heroRaw.desktop);

  const tile = (raw: unknown): TilePicture | null => {
    if (!isRecord(raw)) return null;
    const image = pictureSet(raw.image);
    return image ? { image, alt: altText(raw.alt) } : null;
  };

  return {
    // The mobile picture only ever goes with a desktop one.
    hero: desktop ? { desktop, mobile: pictureSet(heroRaw.mobile), alt: altText(heroRaw.alt) } : null,
    hotDealsTile: tile(images.hot_deals_tile),
    newArrivalsTile: tile(images.new_arrivals_tile),
  };
}

/**
 * How the hero picture loads. It is the first thing on the page, so it is not lazy. It asks to be fetched first only when
 * the slider is not showing: with a live slider above it, the slider's first picture is that one, and two images asking
 * for first place would slow each other down.
 */
export function heroLoading(sliderIsLive: boolean): { loading: "eager"; fetchPriority: "high" | "auto" } {
  return { loading: "eager", fetchPriority: sliderIsLive ? "auto" : "high" };
}
