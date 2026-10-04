export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787/api";

// Public site origin -- used everywhere an absolute URL is produced:
// metadataBase, canonicals, Open Graph, sitemap, robots, llms.txt, JSON-LD.
// Baked in at build time. Defaults to the staging domain so a build that
// forgets to set it can never emit the live domain (or localhost) as canonical.
const DEFAULT_SITE_URL = "https://new.anaizanest.com";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

// Search engines may only index this build when it was made with
// NEXT_PUBLIC_ALLOW_INDEXING=true. Anything else (unset, "false", a typo) is
// treated as staging: robots.txt disallows everything and every page is noindex.
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const CURRENCY_SYMBOL = "৳"; // Bangladeshi Taka sign
