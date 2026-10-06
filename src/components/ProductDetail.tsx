"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import AddToCartForm from "@/components/AddToCartForm";
import ProductCard from "@/components/ProductCard";
import Accordion from "@/components/Accordion";
import ClampedText from "@/components/ClampedText";
import VideoFacade from "@/components/VideoFacade";
import ProductSpecs from "@/components/ProductSpecs";
import Seal from "@/components/Seal";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatDays, resolvePolicy } from "@/lib/policy";
import { RICH_TABLE_CLASSES, wrapTables } from "@/lib/richHtml";
import type { Product, ProductVariant } from "@/lib/types";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper, so both render identical
// markup regardless of which one is currently supplying the data.
export default function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
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

  return (
    // Extra bottom padding on mobile clears the fixed Add to Cart / Buy Now
    // bar (see AddToCartForm) so it doesn't cover the last section of
    // content; not needed at sm and up, where those buttons are in-flow.
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-32 sm:px-6 sm:pb-10">
      <nav className="mb-6 text-caption text-stone">
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

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.images}
          productName={product.name}
          selectedImageId={selectedVariant?.image?.id ?? null}
        />

        <div>
          <p className="text-caption text-stone">SKU: {selectedVariant?.sku ?? product.sku}</p>
          <h1 className="mt-2 font-serif text-charcoal text-h1">{product.name}</h1>
          {product.summary && (
            <ClampedText text={product.summary} className="mt-4 max-w-xl text-body leading-relaxed text-charcoal/80" />
          )}
          <p className="mt-1 text-body text-stone">
            {stockQuantity > 0 ? "In stock" : "Out of stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="text-h2 font-semibold text-charcoal">
              {formatPrice(effectivePrice)}
              {product.gift_box_included && (
                <span className="text-body font-normal text-charcoal/80">, gift box included</span>
              )}
            </span>
            {onSale && (
              <>
                <span className="text-body text-stone line-through">{formatPrice(regularPrice)}</span>
                <span className="rounded-btn bg-linen px-2 py-1 text-caption font-medium text-navy">
                  Save {discountPercent}%
                </span>
              </>
            )}
            {/* The layout's one seal. */}
            <Seal message="Gift-ready" className="ml-auto" />
          </div>

          {product.short_description && (
            <p className="mt-4 max-w-xl text-body text-charcoal/80">
              {product.short_description}
            </p>
          )}

          <div className="mt-6">
            <AddToCartForm
              product={product}
              selectedVariant={selectedVariant}
              onSelectVariant={setSelectedVariant}
            />
          </div>

          {product.video && (product.video.url || product.video.file) && product.video.poster && (
            <div className="mt-8 max-w-xl">
              <VideoFacade video={product.video} />
            </div>
          )}

          <div className="mt-8">
            <Accordion title="Delivery info">
              We deliver across Bangladesh: {formatDays(policy.delivery_days_dhaka)} business days inside Dhaka,{" "}
              {formatDays(policy.delivery_days_outside_dhaka)} outside. Delivery is free inside Dhaka on orders over{" "}
              {formatPrice(policy.free_delivery_threshold)}. You can follow any order on the Track order page with
              your order number and phone number.
            </Accordion>
          </div>
        </div>
      </div>

      {product.description && (
        <section className="mt-16 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">Description</h2>
          {/* CSS-only mobile collapse: the checkbox drives a `peer` class so
              the clipped height only ever changes via CSS (`peer-checked`,
              `sm:`), never JS -- the full description HTML below is always
              present in the server-rendered markup regardless of screen
              size or checkbox state. */}
          <input type="checkbox" id="description-expand" className="peer sr-only" />
          <div
            className={`max-h-40 overflow-hidden text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-body [&_h2]:text-charcoal [&_h2]:first:mt-0 [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mt-4 [&_p]:first:mt-0 [&_ul]:list-disc peer-checked:max-h-none sm:max-h-none sm:overflow-visible ${RICH_TABLE_CLASSES}`}
            dangerouslySetInnerHTML={{ __html: wrapTables(product.description) }}
          />
          <label
            htmlFor="description-expand"
            className="mt-2 inline-block cursor-pointer text-body font-medium text-navy underline peer-checked:hidden sm:hidden"
          >
            Read more
          </label>
          <label
            htmlFor="description-expand"
            className="mt-2 hidden cursor-pointer text-body font-medium text-navy underline peer-checked:inline-block sm:hidden"
          >
            Read less
          </label>
        </section>
      )}

      {boxContents.length > 0 && (
        <section className="mt-16 max-w-3xl">
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
        <section className="mt-16 max-w-3xl">
          <h2 className="mb-4 font-serif text-charcoal text-h2">How do I care for it?</h2>
          <p className="whitespace-pre-line text-body leading-relaxed text-charcoal/80">{careInstructions}</p>
        </section>
      )}

      {product.faqs && product.faqs.length > 0 && (
        <section className="mt-16 max-w-3xl">
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

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-charcoal text-h2">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
