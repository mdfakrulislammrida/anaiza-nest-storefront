import type { MetadataRoute } from "next";
import { getAllProducts, getPages } from "@/lib/api";
import { SITE_URL } from "@/lib/config";

// Required for output: "export" -- there's no server to compute this
// per-request, so it's generated once at build time like every other route.
export const dynamic = "force-static";

// Static-export compatible: this runs once at build time, same as
// generateStaticParams, and Next writes the result to sitemap.xml.
const STATIC_ROUTES = ["/", "/shop", "/hot-deals", "/gift-finder", "/contact", "/faq", "/track-order"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, pages] = await Promise.all([
    getAllProducts().catch(() => []),
    getPages().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: new URL(`/product/${product.slug}`, SITE_URL).toString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: new URL(`/pages/${page.slug}`, SITE_URL).toString(),
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticEntries, ...productEntries, ...pageEntries];
}
