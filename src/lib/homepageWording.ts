import type { HomepageWording, SiteSetting } from "./types";

// What the homepage hero tiles and the newsletter sign-up say when the admin has not written
// anything. Deliberately neutral: no percentage, discount, ranking or time-limit claim. A real
// offer is entered in the admin (Site Settings > Homepage wording), never hardcoded here.
export const DEFAULT_WORDING = {
  hero_badge: null,
  hero_title: "Handcrafted tea sets & gifts, done right.",
  hero_text:
    "Ceramic tea sets, porcelain collections, and premium gift boxes \u2014 curated for Bangladesh, delivered to your door with the payment method you already trust.",
  hot_deals_tile_text: "Hot deals, while stock lasts",
  new_arrivals_tile_text: "New gifts to explore",
  newsletter_headline: "Stay in the loop",
  newsletter_text: "Join our list for news about new arrivals and hot deals.",
} as const;

export interface ResolvedWording {
  hero_badge: string | null;
  hero_title: string;
  hero_text: string;
  hot_deals_tile_text: string;
  new_arrivals_tile_text: string;
  newsletter_headline: string;
  newsletter_text: string;
}

export function resolveWording(siteSettings: SiteSetting | null): ResolvedWording {
  const written: Partial<HomepageWording> = siteSettings?.homepage ?? {};

  return {
    hero_badge: written.hero_badge || DEFAULT_WORDING.hero_badge,
    hero_title: written.hero_title || DEFAULT_WORDING.hero_title,
    hero_text: written.hero_text || DEFAULT_WORDING.hero_text,
    hot_deals_tile_text: written.hot_deals_tile_text || DEFAULT_WORDING.hot_deals_tile_text,
    new_arrivals_tile_text: written.new_arrivals_tile_text || DEFAULT_WORDING.new_arrivals_tile_text,
    newsletter_headline: written.newsletter_headline || DEFAULT_WORDING.newsletter_headline,
    newsletter_text: written.newsletter_text || DEFAULT_WORDING.newsletter_text,
  };
}
