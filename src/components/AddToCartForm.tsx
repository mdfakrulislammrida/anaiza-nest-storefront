"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartAddableProduct } from "@/context/CartContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatPrice } from "@/lib/format";
import { formatDays, resolvePolicy } from "@/lib/policy";
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
  const policy = resolvePolicy(siteSettings);
  // The kit's "pay on delivery" CTA is only honest while cash on delivery is switched on.
  const codOn = siteSettings?.cod_enabled !== false;
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [quantity, setQuantity] = useState(1);

  // A variant only overrides price/stock/image when the admin actually set
  // one for it; otherwise it inherits the product's (see effective_stock on
  // ProductVariant in the API).
  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  const inStock = stockQuantity > 0;
  const maxQuantity = Math.max(stockQuantity, 0);
  // Shown in the mobile sticky bar, which covers the page's own price and option pills.
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
    <div className="space-y-6">
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

      {/* Hidden on mobile -- the sticky bar below carries its own compact
          copy of this control there instead, so quantity stays reachable
          without scrolling back up to this in-flow one. */}
      <div className="hidden items-center gap-4 sm:flex">
        <div className="flex items-center rounded-btn border border-stone/80">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-charcoal transition-colors hover:bg-linen"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex h-10 w-10 items-center justify-center text-body font-medium text-charcoal">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-charcoal transition-colors hover:bg-linen"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Fixed to the viewport bottom on mobile (below the sticky header,
          which is a different corner of the screen, and below the cart
          drawer's z-50) so the primary actions stay reachable without
          scrolling back up; reverts to normal in-flow placement at sm and
          up, where there's no need for it. Carries its own compact quantity
          stepper on mobile (desktop keeps using the in-flow one above,
          unchanged) so quantity can be adjusted without scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 border-t border-linen bg-ivory p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(42,38,34,0.08)] sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:shadow-none sm:flex-row">
        <div className="flex items-center justify-between gap-4 sm:hidden">
          {/* The bar hides the price and the option pills on a phone's first screen, so it states
              both: the price being paid and which option is selected. */}
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
              <span className="text-body font-semibold text-charcoal">{formatPrice(unitPrice)}</span>
              {onSale && <span className="text-body text-stone line-through">{formatPrice(regularPrice)}</span>}
            </p>
            {selectedVariant && (
              <p className="truncate text-caption text-stone">
                {selectedVariant.name}: {selectedVariant.value}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center rounded-btn border border-stone/80">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-charcoal transition-colors hover:bg-linen"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-11 w-11 items-center justify-center text-body font-medium text-charcoal">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
              className="flex h-11 w-11 items-center justify-center text-charcoal transition-colors hover:bg-linen"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            className="flex-1 rounded-btn bg-navy px-4 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inStock ? "Add to cart" : "Out of stock"}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!inStock}
            className="flex-[1.6] rounded-btn bg-burgundy px-4 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {codOn ? CTA.order : "Order now"}
          </button>
        </div>
      </div>

      <p className="text-caption text-stone">
        {formatDays(policy.delivery_days_dhaka)} business days inside Dhaka, {formatDays(policy.delivery_days_outside_dhaka)} outside.
        Free inside Dhaka over {formatPrice(policy.free_delivery_threshold)}.
      </p>
      <p className="text-caption text-stone">{codOn ? "Pay with bKash, Nagad, Rocket or cash on delivery." : "Pay with bKash, Nagad or Rocket."}</p>
    </div>
  );
}
