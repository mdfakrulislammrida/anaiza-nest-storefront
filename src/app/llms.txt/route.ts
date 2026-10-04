import { getCategories, getCategory, getPages, getProducts, getSiteSettings } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { absoluteUrl } from "@/lib/jsonld";

// Static file at build time (Route Handlers render once under output: "export").
export const dynamic = "force-static";

// CMS pages worth pointing an assistant at. Linked rather than summarised:
// the policy text itself is whatever the admin wrote, and this file never
// restates delivery times, fees, returns or guarantees on its own.
const POLICY_SLUGS = ["shipping", "returns", "terms"];

export async function GET() {
  const [siteSettings, categories, pages, featured] = await Promise.all([
    getSiteSettings().catch(() => null),
    getCategories().catch(() => []),
    getPages().catch(() => []),
    getProducts({ is_featured: true, per_page: 12 }).catch(() => null),
  ]);

  // Featured products if any are flagged, otherwise the newest -- same
  // fallback the home page's Bestsellers section uses.
  const products =
    featured && featured.data.length > 0
      ? featured.data
      : ((await getProducts({ sort: "newest", per_page: 12 }).catch(() => null))?.data ?? []);

  // The category list only carries name/slug; the short intro lives on the detail endpoint.
  const categoryDetails = await Promise.all(categories.map((c) => getCategory(c.slug).catch(() => null)));

  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const lines: string[] = [`# ${siteName}`, ""];

  // Brand description first; the footer About text is the fallback when it is blank.
  const description = siteSettings?.brand_description || siteSettings?.footer_about;
  if (description) lines.push(`> ${description}`, "");

  if (categories.length > 0) {
    lines.push("## Categories", "");
    categories.forEach((category, index) => {
      const intro = categoryDetails[index]?.intro_text;
      lines.push(`- [${category.name}](${absoluteUrl(`/category/${category.slug}`)})${intro ? `: ${intro}` : ""}`);
    });
    lines.push("");
  }

  if (products.length > 0) {
    lines.push("## Featured products", "");
    products.forEach((product) => {
      lines.push(`- [${product.name}](${absoluteUrl(`/product/${product.slug}`)})`);
    });
    lines.push("");
  }

  const policyPages = pages.filter((page) => POLICY_SLUGS.includes(page.slug));
  if (policyPages.length > 0) {
    lines.push("## Policies", "");
    policyPages.forEach((page) => {
      lines.push(`- [${page.title}](${absoluteUrl(`/pages/${page.slug}`)})`);
    });
    lines.push("");
  }

  const contact: string[] = [];
  if (siteSettings?.contact_phone) contact.push(`- Phone: ${siteSettings.contact_phone}`);
  if (siteSettings?.contact_email) contact.push(`- Email: ${siteSettings.contact_email}`);
  if (siteSettings?.address) contact.push(`- Address: ${siteSettings.address}`);
  if (contact.length > 0) {
    lines.push("## Contact", "", ...contact, "");
  }

  lines.push("## Sitemap", "", `- ${SITE_URL}/sitemap.xml`, "");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
