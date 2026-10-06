import type { Metadata } from "next";

// `output: "export"` refuses a dynamic route that generates no pages at all, but an empty catalogue
// (no products, categories, pages or articles yet) is a perfectly valid state. When the API answers
// with a valid empty list, the route generates this one placeholder slug instead. The placeholder
// page is the calm "not found" page, marked noindex, and it is never linked from anywhere: it is not
// in sitemap.xml, llms.txt, any menu or any JSON-LD (those are built from the API lists, not from
// the route's params). Real slugs created after the build are served by the client shells
// (/product, /category, /pages, /article) through the .htaccess fallback, so no rebuild is needed.
export const PLACEHOLDER_SLUG = "__placeholder__";

export function staticParamsOrPlaceholder(items: { slug: string }[]): { slug: string }[] {
  return items.length > 0 ? items.map((item) => ({ slug: item.slug })) : [{ slug: PLACEHOLDER_SLUG }];
}

export const PLACEHOLDER_METADATA: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};
