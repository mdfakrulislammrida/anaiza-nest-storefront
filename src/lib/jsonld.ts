import type { Article, Faq, Page, Product, SiteSetting } from "./types";
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

function offerAvailability(stockQuantity: number): string {
  return stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

export function productJsonLd(product: Product) {
  const image = product.images?.[0]?.url ?? product.seo?.og_image ?? undefined;
  const url = absoluteUrl(`/product/${product.slug}`);

  // Variants with their own price stand as distinct Offers; a product whose
  // variants (if any) are purely cosmetic labels keeps the single-offer form.
  const pricedVariants = (product.variants ?? []).filter((variant) => variant.price !== null);

  const offers =
    pricedVariants.length > 0
      ? pricedVariants.map((variant) => ({
          "@type": "Offer",
          name: `${product.name} - ${variant.name}: ${variant.value}`,
          sku: variant.sku,
          url,
          priceCurrency: "BDT",
          price: variant.effective_price,
          availability: offerAvailability(variant.stock_quantity),
        }))
      : {
          "@type": "Offer",
          url,
          priceCurrency: "BDT",
          price: product.effective_price,
          availability: offerAvailability(product.stock_quantity),
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? undefined,
    sku: product.sku,
    ...(image ? { image } : {}),
    url,
    offers,
  };
}

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    url: absoluteUrl(`/blog/${article.slug}`),
    ...(article.featured_image ? { image: article.featured_image } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.seo?.meta_description ? { description: article.seo.meta_description } : {}),
  };
}

export function faqPageJsonLd(faqs: Pick<Faq, "question" | "answer">[]) {
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
