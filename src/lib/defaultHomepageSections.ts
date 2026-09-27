import type { HomepageSection } from "./types";

// Mirrors the backend's homepage_sections migration seed exactly. Used only
// when GET /homepage-sections itself fails or comes back empty (a deploy
// hiccup, the API being down) -- the admin-configured order is layered on
// top of this as an enhancement, never a hard dependency, so the homepage
// never renders blank.
export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: -1, type: "hero_banner", position: 0, custom_title: null, custom_html: null },
  { id: -2, type: "hot_deals", position: 1, custom_title: null, custom_html: null },
  { id: -3, type: "bestsellers", position: 2, custom_title: null, custom_html: null },
  { id: -4, type: "new_arrivals", position: 3, custom_title: null, custom_html: null },
  { id: -5, type: "newsletter", position: 4, custom_title: null, custom_html: null },
];
