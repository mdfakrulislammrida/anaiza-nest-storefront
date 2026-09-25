import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Required for output: "export" -- there's no server to compute this
// per-request, so it's generated once at build time like every other route.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/cart", "/checkout", "/wishlist", "/order-confirmation"],
      },
    ],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
