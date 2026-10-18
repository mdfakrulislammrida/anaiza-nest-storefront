"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartAddableProduct } from "@/context/CartContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatPrice } from "@/lib/format";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { CTA } from "@/lib/brand";
import type { Product, ProductVariant } from "@/lib/types";

export default function AddToCartForm({
  product,
  selectedVariant,
  onSelectVariant,
}: {
  product: Product;
  selectedVariant: ProductVariant | null;
  onSelectVariant: (variant: ProductVariant) => void;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { siteSettings } = useSiteSettings();
  // The kit's "pay on delivery" CTA is only honest while cash on delivery is switched on.
  const codOn = siteSettings?.cod_enabled !== false;
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [quantity, setQuantity] = useState(1);

  // The sticky bar: a phone only, and only once the buy buttons have scrolled up out of sight (never at the top of the page,
  // where they are still to come).
  const phone = useMediaQuery("(max-width: 639px)");
  const buyButtons = useRef<HTMLDivElement>(null);
  const [barShown, setBarShown] = useState(false);
  useEffect(() => {
    const element = buyButtons.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setBarShown(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A variant only overrides price/stock/image when the admin actually set
  // one for it; otherwise it inherits the product's (see effective_stock on
  // ProductVariant in the API).
  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  const inStock = stockQuantity > 0;
  const maxQuantity = Math.max(stockQuantity, 0);
  // Shown in the phone's sticky bar.
  const unitPrice = selectedVariant?.effective_price ?? product.effective_price;
  const regularPrice = selectedVariant?.price ?? product.price;
  const onSale = unitPrice < regularPrice;
  const lowStockAt = siteSettings?.low_stock_threshold ?? 5;
  const lowStock = inStock && lowStockAt > 0 && stockQuantity <= lowStockAt;
  const lowStockText = /colou?r/i.test(selectedVariant?.name ?? "")
    ? "Only a few left in this colour."
    : "Only a few left.";

  function cartAddableProduct(): CartAddableProduct {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      effective_price: selectedVariant?.effective_price ?? product.effective_price,
      stock_quantity: stockQuantity,
      sku: product.sku,
      images: selectedVariant?.image ? [{ url: selectedVariant.image.url }] : product.images,
    };
  }

  function handleAddToCart() {
    if (!inStock) return;
    addItem(cartAddableProduct(), selectedVariant, quantity);
  }

  function handleBuyNow() {
    if (!inStock) return;
    addItem(cartAddableProduct(), selectedVariant, quantity);
    router.push("/checkout");
  }

  return (
    <div className="space-y-4">
      {lowStock && <p className="text-body text-charcoal">{lowStockText}</p>}

      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-caption font-medium text-stone">Options</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => onSelectVariant(variant)}
                disabled={variant.stock_quantity <= 0}
                className={`rounded-btn border px-4 py-2 text-button transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  variant.id === selectedVariant?.id
                    ? "border-navy bg-navy text-ivory"
                    : "border-stone/80 text-charcoal hover:border-navy"
                }`}
              >
                {variant.name}: {variant.value}
                {variant.stock_quantity <= 0 ? " (Out of stock)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The buy buttons, in the page for every screen: the quantity and Add to cart on one row, Order now under them, each
          52 px high and filling the column. On a phone, once they have scrolled out of sight, the bar below keeps one
          Add to cart in reach. */}
      <div ref={buyButtons} className="grid grid-cols-[auto_1fr] gap-2 md:gap-4">
        <div className="flex h-[3.25rem] items-center rounded-btn border border-stone/80">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-[3.25rem] w-12 items-center justify-center text-charcoal transition-colors hover:bg-linen"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span aria-live="polite" className="flex h-[3.25rem] w-10 items-center justify-center text-body font-medium text-charcoal">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
            className="flex h-[3.25rem] w-12 items-center justify-center text-charcoal transition-colors hover:bg-linen"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock}
          className="h-[3.25rem] rounded-btn bg-navy px-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {inStock ? "Add to cart" : "Out of stock"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!inStock}
          className="col-span-2 h-[3.25rem] rounded-btn bg-burgundy px-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {codOn ? CTA.order : "Order now"}
        </button>
      </div>

      {/* A phone only, and only after the buttons above have scrolled up out of sight: the price and one Add to cart, 64 px
          tall. It is mounted only while shown, so the cookie banner and the WhatsApp bubble (which measure
          [data-bottom-bar]) lift by exactly its height, and sit back down when it goes. */}
      {phone && barShown && (
        <div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-between gap-4 border-t border-linen bg-ivory px-4 pb-[env(safe-area-inset-bottom)]"
        >
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 leading-tight">
            <span className="text-body font-semibold text-charcoal">{formatPrice(unitPrice)}</span>
            {onSale && <span className="text-caption text-stone line-through">{formatPrice(regularPrice)}</span>}
          </p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            className="h-11 shrink-0 rounded-btn bg-navy px-6 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inStock ? "Add to cart" : "Out of stock"}
          </button>
        </div>
      )}
    </div>
  );
}
