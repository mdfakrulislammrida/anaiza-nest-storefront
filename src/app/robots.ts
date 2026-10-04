import type { MetadataRoute } from "next";
import { ALLOW_INDEXING, SITE_URL } from "@/lib/config";

// Required for output: "export" -- there's no server to compute this
// per-request, so it's generated once at build time like every other route.
export const dynamic = "force-static";

const NAMED_BOTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
];

// Never crawled by bots that fall under the "*" group. (Sort/filter query
// URLs are deliberately NOT blocked: their canonical points at the clean URL.)
const PRIVATE_PATHS = [
  "/cart",
  "/checkout",
  "/account",
  "/wishlist",
  "/track-order",
  "/order-confirmation",
  "/auth/",
];

export default function robots(): MetadataRoute.Robots {
  // Staging / pre-cutover build: keep every crawler out. No sitemap line --
  // there's nothing to advertise on a site that asks not to be crawled.
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      // A crawler obeys only the single most specific group that matches it,
      // so these named groups do NOT inherit the "*" Disallow list below --
      // Googlebot/Bingbot can still fetch the private pages and read their
      // noindex tag, which is how those pages stay out of the index.
      ...NAMED_BOTS.map((userAgent) => ({ userAgent, allow: "/" })),
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
