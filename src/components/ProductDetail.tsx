"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { pricedView } from "@/lib/pricing";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";
import ProductCard from "@/components/ProductCard";
import Accordion from "@/components/Accordion";
import ClampedText from "@/components/ClampedText";
import ProductSpecs from "@/components/ProductSpecs";
import TrustBadges from "@/components/TrustBadges";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatDays, resolvePolicy } from "@/lib/policy";
import { proseHtml } from "@/lib/prose";
import { productWriting, specLine } from "@/lib/productDisplay";
import { isPathHidden, resolveWhatsApp, whatsappLink } from "@/lib/whatsapp";
import ProductReviews from "@/components/ProductReviews";
import RatingSummary from "@/components/RatingSummary";
import type { Product, ProductVariant, ReviewsPage } from "@/lib/types";

// A small round-edged line icon, one weight like every other icon on the site.
function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-navy">
      {children}
    </svg>
  );
}

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper, so both render identical
// markup regardless of which one is currently supplying the data.
export default function ProductDetail({
  product,
  related,
  reviews = null,
}: {
  product: Product;
  related: Product[];
  // The first page of approved reviews, built into the page (null where it is not known, such as the client-only shell).
  reviews?: ReviewsPage | null;
}) {
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
  const codOn = siteSettings?.cod_enabled !== false;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] ?? null,
  );

  // A variant only overrides price/stock/image when the admin actually set
  // one; otherwise it behaves exactly like the plain product (see the
  // effective_* accessors on ProductVariant in the API).
  // A sale price of 0, or one not below the price, is no sale: never ৳0, never "Save 100%".
  const view = pricedView(product, selectedVariant);
  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  // Both sections are hidden when empty.
  const boxContents = (product.box_contents ?? []).filter((line) => line.trim() !== "");
  const careInstructions = product.care_instructions?.trim() || null;
  const { intro, lead, longHtml } = productWriting(product);
  const details = specLine({ specifications: product.specifications, gift_box_included: product.gift_box_included });

  // A question to the shop about this piece, on the number and the switch in Site Settings. Not shown when the shop has
  // no number, has the bubble switched off, or hides it on product pages.
  const whatsapp = resolveWhatsApp(siteSettings);
  const askLink = whatsapp.showBubble && !isPathHidden(`/product/${product.slug}`, whatsapp.hiddenPaths)
    ? whatsappLink(whatsapp.number, `Hello, I have a question about ${product.name}.`)
    : null;

  // From 768 px the photos and the words sit in two columns. The words are one column of blocks whose order on a phone is
  // the order of a decision (title, what it is, what it costs, how it arrives, buy) and whose order from 768 px keeps the
  // short text under the title. `order-*` does it, so every word stays in the HTML once.
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      {/* The way back: "Anaiza Nest · Category", Inter 13 stone. The menu is in the header on every page. */}
      <nav aria-label="Breadcrumb" className="flex min-h-11 items-center text-caption text-stone sm:pt-6">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-navy">
          Anaiza Nest
        </Link>
        <span aria-hidden="true" className="mx-2">·</span>
        <Link href={`/category/${product.category.slug}`} className="inline-flex min-h-11 items-center hover:text-navy">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:gap-12">
        {/* The photos stay in view under the header while the words scroll past. */}
        <div className="md:sticky md:top-24 md:self-start">
          <ProductGallery
            images={product.images}
            video={product.video}
            productName={product.name}
            selectedImageId={selectedVariant?.image?.id ?? null}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h1 title={product.name} className="order-10 font-serif text-product-title text-charcoal">
            {product.name}
          </h1>

          {details && <p className="order-20 -mt-1 truncate text-caption text-stone">{details}</p>}

          <div className="order-30 empty:hidden">
            <RatingSummary average={product.rating_average} count={product.rating_count} href="#reviews" />
          </div>

          {/* The short text: under the spec line from 768 px, after the buy buttons on a phone. */}
          {intro && (
            <div className="order-[90] md:order-[35]">
              <ClampedText text={intro} className="max-w-xl text-body leading-relaxed text-charcoal/80" />
            </div>
          )}

          {/* The price in Fraunces 500 32px navy; on a real sale the regular price beside it, struck through. */}
          <div className="order-40">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-price-page text-navy">{formatPrice(view.current)}</span>
              {view.old !== null && <span className="font-sans text-body line-through text-stone">{formatPrice(view.old)}</span>}
            </p>
            <p className="mt-1 text-body text-stone">
              {stockQuantity > 0 ? "In stock" : "Out of stock"}
              {product.gift_box_included && <span>, gift box included</span>}
            </p>
          </div>

          {/* How it arrives and how it is paid, from the delivery settings (the days are never written here). */}
          <ul className="order-50 space-y-2 text-caption text-stone">
            <li className="flex gap-2">
              <LineIcon>
                <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              </LineIcon>
              <span>
                {formatDays(policy.delivery_days_dhaka)} business days inside Dhaka, {formatDays(policy.delivery_days_outside_dhaka)} outside.
                Free inside Dhaka over {formatPrice(policy.free_delivery_threshold)}.
              </span>
            </li>
            <li className="flex gap-2">
              <LineIcon>
                <path d="M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 12h.01M18 12h.01" />
              </LineIcon>
              <span>{codOn ? "Pay with bKash, Nagad, Rocket or cash on delivery." : "Pay with bKash, Nagad or Rocket."}</span>
            </li>
          </ul>

          <div className="order-[60]">
            <AddToCartForm product={product} selectedVariant={selectedVariant} onSelectVariant={setSelectedVariant} />
          </div>

          {askLink && (
            <a
              href={askLink}
              target="_blank"
              rel="noreferrer noopener"
              className="order-[70] flex min-h-11 w-fit items-center text-caption text-navy underline"
            >
              Questions? Ask us on WhatsApp
            </a>
          )}

          <div className="order-[80]">
            <TrustBadges compact omit={["Gift-ready", "Delivery", "Cash on delivery"]} />
          </div>

          <p className="order-[95] text-caption text-stone">SKU: {selectedVariant?.sku ?? product.sku}</p>

          <div className="order-[96]">
            <Accordion title="Delivery info">
              We deliver across Bangladesh: {formatDays(policy.delivery_days_dhaka)} business days inside Dhaka,{" "}
              {formatDays(policy.delivery_days_outside_dhaka)} outside. Delivery is free inside Dhaka on orders over{" "}
              {formatPrice(policy.free_delivery_threshold)}. You can follow any order on the Track order page with
              your order number and phone number.
            </Accordion>
          </div>
        </div>
      </div>

      {(lead || longHtml) && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">Description</h2>
          {lead && <p className="mb-4 text-body leading-relaxed text-charcoal/80">{lead}</p>}
          {longHtml && (
            <>
              {/* CSS-only mobile collapse: the checkbox drives a `peer` class so the clipped height only ever changes via
                  CSS (`peer-checked`, `sm:`), never JS -- the full description HTML below is always present in the
                  server-rendered markup regardless of screen size or checkbox state. */}
              <input type="checkbox" id="description-expand" className="peer sr-only" />
              <div
                className="an-prose max-h-[26rem] overflow-hidden peer-checked:max-h-none sm:max-h-none sm:overflow-visible"
                dangerouslySetInnerHTML={{ __html: proseHtml(longHtml, true) }}
              />
              <label
                htmlFor="description-expand"
                className="mt-2 inline-flex min-h-11 cursor-pointer items-center text-body font-medium text-navy underline peer-checked:hidden sm:hidden"
              >
                Read more
              </label>
              <label
                htmlFor="description-expand"
                className="mt-2 hidden min-h-11 cursor-pointer items-center text-body font-medium text-navy underline peer-checked:inline-flex sm:hidden"
              >
                Read less
              </label>
            </>
          )}
        </section>
      )}

      {boxContents.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">What is in the box?</h2>
          <ul className="ml-6 list-disc space-y-1 text-body text-charcoal/80">
            {boxContents.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <ProductSpecs specifications={product.specifications ?? []} />

      {careInstructions && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">How do I care for it?</h2>
          <p className="whitespace-pre-line text-body leading-relaxed text-charcoal/80">{careInstructions}</p>
        </section>
      )}

      <ProductReviews slug={product.slug} initial={reviews} />

      {/* Up to four from the same category, and not worth a row for one. */}
      {related.length >= 2 && (
        <section className="mt-12">
          <h2 className="mb-6 font-serif text-charcoal text-h2">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {product.faqs && product.faqs.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">
            Frequently asked questions
          </h2>
          <div>
            {product.faqs.map((faq) => (
              <Accordion key={faq.id} title={faq.question} asHeading>
                {faq.answer}
              </Accordion>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
