import type { Article, CategoryDetail, DayRange, Faq, Page, Product, ProductSpec, SiteSetting, StorePolicy } from "./types";
import { SITE_URL } from "./config";
import { BD_DIVISIONS } from "./bangladesh-geography";

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
    ...(siteSettings?.brand_description || siteSettings?.footer_about
      ? { description: siteSettings.brand_description || siteSettings.footer_about }
      : {}),
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

const rate = (value: number) => ({ "@type": "MonetaryAmount", value, currency: "BDT" });

const transit = (days: DayRange) => ({
  "@type": "ShippingDeliveryTime",
  transitTime: { "@type": "QuantitativeValue", minValue: days.min, maxValue: days.max, unitCode: "DAY" },
});

// Both zones come straight from the Delivery & returns settings. Free delivery
// is a cart-level rule, so the Dhaka rate here is what a single-item order for
// this price would pay.
function shippingDetailsFor(policy: StorePolicy, price: number) {
  const dhakaRate = price > policy.free_delivery_threshold ? 0 : policy.delivery_fee_dhaka;
  const region = (addressRegion: string) => ({ "@type": "DefinedRegion", addressCountry: "BD", addressRegion });

  return [
    {
      "@type": "OfferShippingDetails",
      shippingRate: rate(dhakaRate),
      shippingDestination: region("Dhaka"),
      deliveryTime: transit(policy.delivery_days_dhaka),
    },
    {
      "@type": "OfferShippingDetails",
      shippingRate: rate(policy.delivery_fee_outside_dhaka),
      shippingDestination: BD_DIVISIONS.filter((division) => division !== "Dhaka").map(region),
      deliveryTime: transit(policy.delivery_days_outside_dhaka),
    },
  ];
}

function returnPolicyFor(policy: StorePolicy) {
  return policy.return_window_days > 0
    ? {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: policy.return_window_days,
      }
    : {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      };
}

// A barcode is published only when it is filled in, under the property that
// matches its length (an 8/12/13/14 digit code is a GTIN-8/12/13/14).
function gtinProperty(gtin: string | null): Record<string, string> {
  if (!gtin) return {};
  const key = ({ 8: "gtin8", 12: "gtin12", 13: "gtin13", 14: "gtin14" } as Record<number, string>)[gtin.length];
  return key ? { [key]: gtin } : {};
}

// Spec rows become schema.org properties only where the mapping is unambiguous:
// every row as a PropertyValue, plus Material / Colour rows as the matching
// native property. Nothing is inferred beyond what the admin typed.
function specProperties(specs: ProductSpec[] | undefined) {
  const rows = (specs ?? []).filter((spec) => spec.label && spec.value);
  if (rows.length === 0) return {};

  const byLabel = (...labels: string[]) =>
    rows.find((spec) => labels.includes(spec.label.trim().toLowerCase()))?.value;
  const material = byLabel("material");
  const color = byLabel("color", "colour");

  return {
    ...(material ? { material } : {}),
    ...(color ? { color } : {}),
    additionalProperty: rows.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
  };
}

export function productJsonLd(product: Product, policy?: StorePolicy | null) {
  const image = product.images?.[0]?.url ?? product.seo?.og_image ?? undefined;
  const url = absoluteUrl(`/product/${product.slug}`);

  // Shipping and returns are attached only when the settings were available.
  const policyFor = (price: number) =>
    policy ? { shippingDetails: shippingDetailsFor(policy, price), hasMerchantReturnPolicy: returnPolicyFor(policy) } : {};

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
          ...policyFor(variant.effective_price),
        }))
      : {
          "@type": "Offer",
          url,
          priceCurrency: "BDT",
          price: product.effective_price,
          availability: offerAvailability(product.stock_quantity),
          ...policyFor(product.effective_price),
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? undefined,
    sku: product.sku,
    ...gtinProperty(product.gtin),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...specProperties(product.specifications),
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
    ...(article.author?.name
      ? {
          author: {
            "@type": "Person",
            name: article.author.name,
            ...(article.author.bio ? { description: article.author.bio } : {}),
          },
        }
      : {}),
    url: absoluteUrl(`/blog/${article.slug}`),
    ...(article.featured_image ? { image: article.featured_image } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.updated_at ? { dateModified: article.updated_at } : {}),
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
