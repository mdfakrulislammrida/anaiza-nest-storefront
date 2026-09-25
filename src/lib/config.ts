export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787/api";

// Public site origin -- used for metadataBase, canonical/OG URLs, JSON-LD,
// and the generated sitemap.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const CURRENCY_SYMBOL = "৳"; // Bangladeshi Taka sign
