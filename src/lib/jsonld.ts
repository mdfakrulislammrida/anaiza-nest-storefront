import type { Faq, Page, Product, SiteSetting } from "./types";
import { SITE_URL } from "./config";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function organizationJsonLd(siteSettings: SiteSetting | null) {
  const name = siteSettings?.site_name ?? "Anaiza Nest";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: SITE_URL,
    ...(siteSettings?.logo_url ? { logo: siteSettings.logo_url } : {}),
    ...(siteSettings?.contact_phone || siteSettings?.contact_email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(siteSettings?.contact_phone ? { telephone: siteSettings.contact_phone } : {}),
            ...(siteSettings?.contact_email ? { email: siteSettings.contact_email } : {}),
          },
        }
      : {}),
    ...(siteSettings?.address ? { address: siteSettings.address } : {}),
  };
}

export function productJsonLd(product: Product) {
  const image = product.images?.[0]?.url ?? product.seo?.og_image ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    ...(image ? { image } : {}),
    url: absoluteUrl(`/product/${product.slug}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: "BDT",
      price: product.effective_price,
      availability:
        product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
}

export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function pageMetaFromCms(page: Page) {
  return {
    title: page.seo?.meta_title || page.title,
    description: page.seo?.meta_description ?? undefined,
    image: page.seo?.og_image ?? undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
