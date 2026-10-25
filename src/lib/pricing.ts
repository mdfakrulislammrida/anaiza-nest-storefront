// What a shopper is charged and shown, worked out from the regular price and the sale price alone. The API sends
// effective_price and discount_percent too, but a sale price of 0 once came through as a price of ৳0 and "Save 100%",
// so the shop does not trust them: a sale counts only when it is a real number above 0 and below the regular price.
// No imports on purpose, so the node tests can load it.

export interface PriceView {
  // What the piece costs.
  current: number;
  // The regular price, to strike through; null when there is no sale.
  old: number | null;
  onSale: boolean;
  // How much is saved (0 when there is no sale).
  saving: number;
}

export function saleApplies(regular: number, sale: number | null | undefined): sale is number {
  return typeof sale === "number" && Number.isFinite(sale) && sale > 0 && sale < regular;
}

export function priceView(regular: number, sale?: number | null): PriceView {
  if (saleApplies(regular, sale)) {
    return { current: sale, old: regular, onSale: true, saving: regular - sale };
  }

  return { current: regular, old: null, onSale: false, saving: 0 };
}

interface Priced {
  price: number;
  sale_price: number | null;
}

interface VariantPriced {
  price: number | null;
  sale_price: number | null;
}

// A product as it comes from the API, with effective_price and discount_percent (on it and on every variant) worked out
// again from the regular and the sale price. Everything downstream (cards, the cart, the pixels, the page's structured
// data) then reads numbers that follow the one rule above, whatever an older API sent for a sale price of 0.
export function withCheckedPrices<
  T extends {
    price: number;
    sale_price: number | null;
    effective_price: number;
    discount_percent: number | null;
    variants?: { price: number | null; sale_price: number | null; effective_price: number; discount_percent: number | null }[];
  },
>(product: T): T {
  const own = priceView(product.price, product.sale_price);

  return {
    ...product,
    sale_price: own.onSale ? product.sale_price : null,
    effective_price: own.current,
    discount_percent: own.onSale ? Math.round((own.saving / product.price) * 100) : null,
    ...(product.variants
      ? {
          variants: product.variants.map((variant) => {
            const view = pricedView(product, variant);
            const hasOwnPrice = variant.price !== null && variant.price !== undefined;

            return {
              ...variant,
              sale_price: hasOwnPrice && view.onSale ? variant.sale_price : null,
              effective_price: view.current,
              discount_percent: view.onSale ? Math.round((view.saving / (view.old as number)) * 100) : null,
            };
          }),
        }
      : {}),
  };
}

// A variant with its own price has its own sale; one without takes the product's, as the API does.
export function pricedView(product: Priced, variant?: VariantPriced | null): PriceView {
  if (variant && variant.price !== null && variant.price !== undefined) {
    return priceView(variant.price, variant.sale_price);
  }

  return priceView(product.price, product.sale_price);
}
