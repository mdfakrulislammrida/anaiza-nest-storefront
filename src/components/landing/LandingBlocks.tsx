"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartAddableProduct } from "@/context/CartContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import Accordion from "@/components/Accordion";
import CountdownTimer from "@/components/CountdownTimer";
import RatingSummary from "@/components/RatingSummary";
import ResponsiveImage from "@/components/ResponsiveImage";
import GiftFrame from "@/components/GiftFrame";
import Stars from "@/components/Stars";
import { CTA } from "@/lib/brand";
import { formatPrice } from "@/lib/format";
import { faqPageJsonLd } from "@/lib/jsonld";
import { heroDestination, LANDING_ANCHORS } from "@/lib/landing";
import { RICH_TABLE_CLASSES, wrapTables } from "@/lib/richHtml";
import type { LandingBlock, Product, ProductVariant } from "@/lib/types";

type Block<T extends LandingBlock["type"]> = Extract<LandingBlock, { type: T }>;

const SECTION = "mx-auto w-full max-w-5xl px-4 py-10 sm:px-6";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Hero

export function HeroBlock({ block, headline }: { block: Block<"hero">; headline: string }) {
  const destination = heroDestination(block.button_target, block.button_url);
  const text = block.headline || headline;
  const buttonClass =
    "mt-8 inline-flex min-h-12 items-center justify-center rounded-btn bg-ivory px-8 py-4 text-button text-navy transition-opacity hover:opacity-90";

  return (
    <section className="relative isolate flex min-h-[26rem] items-end overflow-hidden bg-navy text-ivory sm:min-h-[30rem] sm:items-center">
      {block.image_desktop || block.image_mobile ? (
        <picture>
          {block.image_mobile && <source media="(max-width: 639px)" srcSet={block.image_mobile} />}
          {/* The one image on the page that loads at once: it is what the visitor sees first. */}
          <img
            src={block.image_desktop ?? block.image_mobile ?? undefined}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        </picture>
      ) : null}
      <div data-scrim="" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/80 via-navy/40 to-navy/20" aria-hidden="true" />
      <GiftFrame />

      <div className="mx-auto w-full max-w-5xl px-8 py-14 sm:px-12">
        <h1 className="max-w-2xl font-serif text-h1 text-ivory">{text}</h1>
        {block.subline && <p className="mt-4 max-w-xl text-base text-ivory/90">{block.subline}</p>}

        {destination && (
          destination.kind === "anchor" ? (
            <button type="button" onClick={() => scrollToId(destination.id)} className={buttonClass}>
              {block.button_text || CTA.order}
            </button>
          ) : (
            <a href={destination.href} className={buttonClass}>
              {block.button_text || CTA.order}
            </a>
          )
        )}
      </div>
    </section>
  );
}

// ---- Text

const RICH_CLASSES =
  "space-y-4 text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-h2 [&_h2]:text-charcoal [&_h3]:mt-4 [&_h3]:font-serif [&_h3]:text-h2 [&_h3]:text-charcoal [&_img]:h-auto [&_img]:max-w-full [&_li]:ml-6 [&_ol]:list-decimal [&_strong]:text-charcoal [&_ul]:list-disc";

export function RichTextBlock({ block }: { block: Block<"rich_text"> }) {
  if (!block.html) return null;

  return (
    <section className={SECTION}>
      <div className={`${RICH_CLASSES} ${RICH_TABLE_CLASSES}`} dangerouslySetInnerHTML={{ __html: wrapTables(block.html) }} />
    </section>
  );
}

// ---- Custom HTML

// The author's HTML, already cleaned by the server and with its CSS scoped to scope_class. It sits in a box that keeps
// it inside itself: nothing it does can paint over, cover or restyle the site's own header, order form or cookie banner.
// Scripts only exist here when the server kept them (a person with that permission asked for them).
export function CustomHtmlBlock({ block }: { block: Block<"custom_html"> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!block.scripts || !ref.current) return;

    // innerHTML never runs scripts; each one is re-created so the browser does.
    ref.current.querySelectorAll("script").forEach((old) => {
      const fresh = document.createElement("script");
      for (const attribute of Array.from(old.attributes)) fresh.setAttribute(attribute.name, attribute.value);
      fresh.text = old.textContent ?? "";
      old.replaceWith(fresh);
    });
  }, [block.html, block.scripts]);

  if (!block.html) return null;

  return (
    <section className="w-full">
      <div
        ref={ref}
        // contain: layout paint makes position: fixed inside it relative to the box and clips overflow; isolation keeps
        // z-index inside it from ever beating the site's header or the cookie banner.
        className={`${block.scope_class} relative mx-auto w-full max-w-5xl overflow-hidden px-4 sm:px-6 [&_img]:h-auto [&_img]:max-w-full [&_video]:max-w-full`}
        style={{ contain: "layout paint", isolation: "isolate" }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    </section>
  );
}

// ---- Products

function ProductItem({
  product,
  block,
  eager,
  hasOrderForm,
  onAdded,
}: {
  product: Product;
  block: Block<"products">;
  eager: boolean;
  hasOrderForm: boolean;
  onAdded: () => void;
}) {
  const router = useRouter();
  const { addItem, closeDrawer } = useCart();
  const { siteSettings } = useSiteSettings();
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const firstInStock = variants.find((variant) => variant.stock_quantity > 0) ?? null;
  const [variantId, setVariantId] = useState<number | null>(firstInStock?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const variant: ProductVariant | null = block.picker ? (variants.find((v) => v.id === variantId) ?? null) : variants.length > 0 ? firstInStock : null;
  const stock = variant ? variant.stock_quantity : product.stock_quantity;
  const inStock = stock > 0;
  const unit = variant?.effective_price ?? product.effective_price;
  const regular = variant?.price ?? product.price;
  const onSale = unit < regular;
  const image = variant?.image ?? product.images?.[0] ?? null;
  const codOn = siteSettings?.cod_enabled !== false;
  const horizontal = block.layout === "list";

  function add() {
    if (!inStock) return;

    const addable: CartAddableProduct = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      effective_price: unit,
      stock_quantity: stock,
      sku: product.sku,
      images: image ? [{ url: image.url }] : product.images,
    };

    addItem(addable, variant, block.picker ? quantity : 1);
    // The cart drawer is not part of a landing page: the order form is.
    closeDrawer();
    onAdded();

    if (hasOrderForm) {
      // After the form has had a moment to show the new line.
      setTimeout(() => scrollToId(LANDING_ANCHORS.order), 60);
    } else {
      router.push("/checkout");
    }
  }

  return (
    <article className={horizontal ? "flex gap-4 border-b border-linen pb-6" : "flex flex-col"}>
      <div className={`relative shrink-0 overflow-hidden bg-linen shadow-warm ${horizontal ? "aspect-square w-28 sm:w-40" : "aspect-square w-full"}`}>
        {image ? (
          <ResponsiveImage
            image={image}
            alt={image.alt_text || product.name}
            sizes={horizontal ? "160px" : "(min-width: 1024px) 33vw, 50vw"}
            priority={eager}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <span className="font-serif text-body text-charcoal/70">Anaiza Nest</span>
          </div>
        )}
      </div>

      <div className={`min-w-0 ${horizontal ? "flex-1" : "mt-4"}`}>
        <h3 className="text-body font-medium text-charcoal">{product.name}</h3>
        <RatingSummary average={product.rating_average} count={product.rating_count} compact />

        {block.show_price && (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-charcoal">{formatPrice(unit)}</span>
            {onSale && <span className="text-body text-stone line-through">{formatPrice(regular)}</span>}
            {onSale && <span className="text-caption text-navy">Special price</span>}
          </p>
        )}

        {block.picker && variants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Options for ${product.name}`}>
            {variants.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === variantId}
                disabled={option.stock_quantity <= 0}
                onClick={() => setVariantId(option.id)}
                className={`min-h-11 rounded-btn border px-3 py-2 text-caption transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  option.id === variantId ? "border-navy bg-navy text-ivory" : "border-stone/80 text-charcoal hover:border-navy"
                }`}
              >
                {option.value}
                {option.stock_quantity <= 0 ? " (sold out)" : ""}
              </button>
            ))}
          </div>
        )}

        {block.picker && inStock && (
          <div className="mt-3 flex items-center">
            <div className="flex items-center rounded-btn border border-stone/80">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center text-charcoal hover:bg-linen"
                aria-label={`Fewer ${product.name}`}
              >
                &minus;
              </button>
              <span className="flex h-11 min-w-8 items-center justify-center text-body font-medium text-charcoal">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(stock, 1), q + 1))}
                className="flex h-11 w-11 items-center justify-center text-charcoal hover:bg-linen"
                aria-label={`More ${product.name}`}
              >
                +
              </button>
            </div>
          </div>
        )}

        {block.show_button && (
          <button
            type="button"
            onClick={add}
            disabled={!inStock}
            className="mt-4 min-h-12 w-full rounded-btn bg-navy px-4 py-3 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-linen disabled:text-charcoal/70 disabled:opacity-100"
          >
            {!inStock ? "Sold out" : codOn ? CTA.order : "Order now"}
          </button>
        )}
      </div>
    </article>
  );
}

export function ProductsBlock({
  block,
  eagerFirst,
  hasOrderForm,
  onAdded,
}: {
  block: Block<"products">;
  eagerFirst: boolean;
  hasOrderForm: boolean;
  onAdded: () => void;
}) {
  return (
    <section id={LANDING_ANCHORS.products} className={`${SECTION} scroll-mt-4`}>
      {block.heading && <h2 className="mb-6 font-serif text-h2 text-charcoal">{block.heading}</h2>}
      <div className={block.layout === "list" ? "space-y-6" : "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6"}>
        {block.products.map((product, index) => (
          <ProductItem key={product.id} product={product} block={block} eager={eagerFirst && index === 0} hasOrderForm={hasOrderForm} onAdded={onAdded} />
        ))}
      </div>
    </section>
  );
}

// ---- Benefits

const ICON_PATHS: Record<string, string> = {
  delivery: "M1 6h13v10H1zM14 10h4l3 3v3h-7zM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  cash: "M2 7h20v10H2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v4M18 10v4",
  gift: "M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2 0-4-1-4-3s3-2 4 1c1-3 4-3 4-1s-2 3-4 3z",
  packed: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  secure: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM9 12l2 2 4-4",
  support: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2",
  check: "M4 12l5 5L20 6",
};

export function BenefitsBlock({ block }: { block: Block<"benefits"> }) {
  return (
    <section className={`${SECTION} bg-linen/40`}>
      {block.heading && <h2 className="mb-6 text-center font-serif text-h2 text-charcoal">{block.heading}</h2>}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {block.items.map((item, index) => (
          <li key={`${item.text}-${index}`} className="flex items-center gap-3 text-body text-charcoal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 shrink-0 text-navy" aria-hidden="true">
              <path d={ICON_PATHS[item.icon] ?? ICON_PATHS.check} />
            </svg>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- FAQ

export function FaqBlock({ block }: { block: Block<"faq"> }) {
  return (
    <section className={SECTION}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(block.items)) }} />
      <h2 className="mb-4 font-serif text-h2 text-charcoal">{block.heading || "Questions people ask"}</h2>
      <div className="border-t border-linen">
        {block.items.map((faq) => (
          <Accordion key={faq.id} title={faq.question} asHeading>
            <p className="whitespace-pre-line">{faq.answer}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}

// ---- Reviews

export function ReviewsBlock({ block }: { block: Block<"reviews"> }) {
  return (
    <section className={SECTION}>
      <h2 className="font-serif text-h2 text-charcoal">{block.heading || "What people say"}</h2>
      <div className="mt-2">
        <RatingSummary average={block.summary.rating_average} count={block.summary.rating_count} />
      </div>
      <ul className="mt-6 space-y-6">
        {block.items.map((review) => (
          <li key={review.id} className="border-b border-linen pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Stars rating={review.rating} />
              <span className="text-body font-medium text-charcoal">{review.name}</span>
              {review.verified_purchase && <span className="text-caption text-stone">Verified purchase</span>}
            </div>
            {review.title && <p className="mt-2 text-body font-medium text-charcoal">{review.title}</p>}
            <p className="mt-1 whitespace-pre-line text-body text-charcoal/80">{review.body}</p>
            {review.product_name && <p className="mt-1 text-caption text-stone">On {review.product_name}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- Countdown

export function CountdownBlock({ block }: { block: Block<"countdown"> }) {
  return (
    <section className="bg-navy text-ivory">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-4 py-4 sm:px-6">
        {block.label && <p className="text-body font-medium text-ivory">{block.label}</p>}
        {/* A real end time, from the page's closing time. It hides itself when the time has passed. */}
        <CountdownTimer endsAt={block.ends_at} />
      </div>
    </section>
  );
}
