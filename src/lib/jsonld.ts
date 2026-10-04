import type { Article, CategoryDetail, Faq, Page, Product, SiteSetting } from "./types";
import { SITE_URL } from "./config";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

// Stable node ids, so the Organization and WebSite are emitted once (root
// layout) and every other page's JSON-LD -- Product brand, Article publisher
// -- can point at them with {"@id": ...} instead of repeating them.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const SITE_NAME_FALLBACK = "Anaiza Nest";

// Everything below comes from site-settings; a field that isn't set is simply
// left out rather than filled with a guess.
function organizationNode(siteSettings: SiteSetting | null) {
  const name = siteSettings?.site_name ?? SITE_NAME_FALLBACK;
  const sameAs = (siteSettings?.social_links ?? []).map((link) => link.url).filter(Boolean);

  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name,
    url: SITE_URL,
    ...(siteSettings?.logo_url
      ? { logo: { "@type": "ImageObject", url: siteSettings.logo_url } }
      : {}),
    ...(siteSettings?.footer_about ? { description: siteSettings.footer_about } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
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
    ...(siteSettings?.address
      ? { address: { "@type": "PostalAddress", streetAddress: siteSettings.address } }
      : {}),
  };
}

function websiteNode(siteSettings: SiteSetting | null) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: siteSettings?.site_name ?? SITE_NAME_FALLBACK,
    publisher: { "@id": ORGANIZATION_ID },
    // No SearchAction on purpose: Google retired the sitelinks search box, so
    // it would buy nothing.
  };
}

// One @graph with both entities, emitted from the root layout.
export function siteJsonLd(siteSettings: SiteSetting | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(siteSettings), websiteNode(siteSettings)],
  };
}

function offerAvailability(stockQuantity: number): string {
  return stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

// First page of a listing, for category pages. Names, URLs and prices are the
// real catalog values (BDT) -- nothing is added that the API didn't return.
export function itemListJsonLd(name: string, path: string, products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const image = product.images?.[0]?.url;
      return {
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/product/${product.slug}`),
        item: {
          "@type": "Product",
          name: product.name,
          url: absoluteUrl(`/product/${product.slug}`),
          ...(image ? { image } : {}),
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: product.effective_price,
            availability: offerAvailability(product.stock_quantity),
          },
        },
      };
    }),
  };
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
    // The product's own Brand when one is set in the admin; otherwise the
    // store itself (the Organization node from the root layout).
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : { "@id": ORGANIZATION_ID },
    ...(image ? { image } : {}),
    url,
    offers,
    // No aggregateRating / review: the API has no real product review data.
  };
}

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    publisher: { "@id": ORGANIZATION_ID },
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

export function categoryMetaFromApi(category: CategoryDetail) {
  return {
    title: category.seo.meta_title,
    description: category.seo.meta_description || category.intro_text || undefined,
    image: category.banner_desktop.url ?? undefined,
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
