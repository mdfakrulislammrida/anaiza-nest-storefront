"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";
import ProductCard from "@/components/ProductCard";
import Accordion from "@/components/Accordion";
import ClampedText from "@/components/ClampedText";
import ProductSpecs from "@/components/ProductSpecs";
import Seal from "@/components/Seal";
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
  const effectivePrice = selectedVariant?.effective_price ?? product.effective_price;
  const discountPercent = selectedVariant?.discount_percent ?? product.discount_percent;
  const regularPrice = selectedVariant?.price ?? product.price;
  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  const onSale = discountPercent !== null;
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
      {/* A phone: one row for the way back and the menu (the menu bar is not repeated above it on a product page). */}
      <div className="flex h-11 items-center justify-between sm:hidden">
        <Link
          href={`/category/${product.category.slug}`}
          aria-label={`Back to ${product.category.name}`}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-body text-stone hover:text-navy"
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="m15 6-6 6 6 6" />
          </svg>
          {product.category.name}
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("anaiza:menu"))}
          aria-controls="mobile-menu"
          className="-mr-2 flex min-h-11 items-center gap-2 px-2 text-body font-medium text-charcoal"
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menu
        </button>
      </div>

      <nav className="mb-6 hidden pt-10 text-caption text-stone sm:block">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/category/${product.category.slug}`} className="hover:text-navy">
          {product.category.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">{product.name}</span>
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
          <h1 title={product.name} className="order-10 line-clamp-2 pr-14 font-serif text-[1.5rem] leading-7 text-charcoal sm:line-clamp-none sm:pr-0 sm:text-[1.75rem] sm:leading-[2.125rem] lg:text-h1">
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

          {/* Price and stock together, with the seal where it has always been: beside them. */}
          <div className="order-40 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-h2 font-semibold text-charcoal">{formatPrice(effectivePrice)}</span>
                {onSale && (
                  <>
                    <span className="text-body text-stone line-through">{formatPrice(regularPrice)}</span>
                    <span className="rounded-btn bg-linen px-2 py-1 text-caption font-medium text-navy">Save {discountPercent}%</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-body text-stone">
                {stockQuantity > 0 ? "In stock" : "Out of stock"}
                {product.gift_box_included && <span>, gift box included</span>}
              </p>
            </div>
            {/* The layout's one seal. */}
            <Seal message="Gift-ready" />
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
