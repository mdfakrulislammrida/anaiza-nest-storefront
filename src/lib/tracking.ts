import type { CartAddableProduct } from "@/context/CartContext";
import type { CartItem } from "@/context/CartContext";
import type { Order, PaymentMethod, Product } from "./types";

// All three platforms' scripts are injected conditionally (only when an
// admin has actually set that ID -- see layout.tsx), so every function here
// has to be a safe no-op when the underlying script never loaded. That's
// the whole point: this module can be called unconditionally from anywhere
// in the app without knowing whether tracking is configured.

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
    };
  }
}

const CURRENCY = "BDT";

function pushDataLayer(event: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // Clear the previous ecommerce object first -- Google's own recommended
  // pattern, so object fields don't merge across events.
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(event);
}

function fbqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}

function ttqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.ttq === "undefined") return;
  window.ttq.track(event, params);
}

/** Fires fbq PageView / ttq.page() on a client-side route change. The base
 * install snippets only fire these once, on initial script load. */
export function trackPageView() {
  fbqTrack("PageView");
  if (typeof window !== "undefined" && typeof window.ttq !== "undefined") {
    window.ttq.page();
  }
}

function ga4Item(product: { sku?: string; id: number; name: string; effective_price?: number; price?: number; category?: { name: string } }, quantity = 1) {
  return {
    item_id: product.sku ?? String(product.id),
    item_name: product.name,
    price: product.effective_price ?? product.price ?? 0,
    ...(product.category ? { item_category: product.category.name } : {}),
    quantity,
  };
}

export function trackViewItem(product: Product) {
  pushDataLayer({
    event: "view_item",
    ecommerce: {
      currency: CURRENCY,
      value: product.effective_price,
      items: [ga4Item(product)],
    },
  });
  fbqTrack("ViewContent", {
    content_ids: [product.sku ?? String(product.id)],
    content_name: product.name,
    content_type: "product",
    currency: CURRENCY,
    value: product.effective_price,
  });
  ttqTrack("ViewContent", {
    content_id: product.sku ?? String(product.id),
    content_name: product.name,
    content_type: "product",
    currency: CURRENCY,
    value: product.effective_price,
  });
}

export function trackViewItemList(products: Product[], listName: string) {
  if (products.length === 0) return;
  pushDataLayer({
    event: "view_item_list",
    ecommerce: {
      item_list_name: listName,
      items: products.map((p) => ga4Item(p)),
    },
  });
}

export function trackAddToCart(product: CartAddableProduct, quantity: number) {
  const value = product.effective_price * quantity;
  pushDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: CURRENCY,
      value,
      items: [ga4Item(product, quantity)],
    },
  });
  fbqTrack("AddToCart", {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: "product",
    currency: CURRENCY,
    value,
  });
  ttqTrack("AddToCart", {
    content_id: String(product.id),
    content_name: product.name,
    content_type: "product",
    currency: CURRENCY,
    value,
  });
}

export function trackRemoveFromCart(item: CartItem) {
  pushDataLayer({
    event: "remove_from_cart",
    ecommerce: {
      currency: CURRENCY,
      value: item.price * item.quantity,
      items: [
        {
          item_id: String(item.productId),
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        },
      ],
    },
  });
}

export function trackBeginCheckout(items: CartItem[], value: number) {
  if (items.length === 0) return;
  const ga4Items = items.map((item) => ({
    item_id: String(item.productId),
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  pushDataLayer({
    event: "begin_checkout",
    ecommerce: { currency: CURRENCY, value, items: ga4Items },
  });
  fbqTrack("InitiateCheckout", {
    content_ids: items.map((item) => String(item.productId)),
    contents: ga4Items.map((item) => ({ id: item.item_id, quantity: item.quantity })),
    currency: CURRENCY,
    value,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  });
  ttqTrack("InitiateCheckout", {
    contents: ga4Items.map((item) => ({ content_id: item.item_id, quantity: item.quantity, price: item.price })),
    currency: CURRENCY,
    value,
  });
}

export function trackAddShippingInfo(items: CartItem[], value: number, shippingTier: string) {
  pushDataLayer({
    event: "add_shipping_info",
    ecommerce: {
      currency: CURRENCY,
      value,
      shipping_tier: shippingTier,
      items: items.map((item) => ({
        item_id: String(item.productId),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
}

export function trackAddPaymentInfo(items: CartItem[], value: number, paymentMethod: PaymentMethod) {
  pushDataLayer({
    event: "add_payment_info",
    ecommerce: {
      currency: CURRENCY,
      value,
      payment_type: paymentMethod,
      items: items.map((item) => ({
        item_id: String(item.productId),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });
}

export function trackPurchase(order: Order) {
  const ga4Items = order.items.map((item) => ({
    item_id: String(item.product_id),
    item_name: item.product_name,
    price: item.price,
    quantity: item.quantity,
  }));

  pushDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: String(order.id),
      value: order.total,
      currency: CURRENCY,
      shipping: order.delivery_fee,
      items: ga4Items,
    },
  });
  fbqTrack("Purchase", {
    content_ids: ga4Items.map((item) => item.item_id),
    contents: ga4Items.map((item) => ({ id: item.item_id, quantity: item.quantity })),
    currency: CURRENCY,
    value: order.total,
  });
  // CompletePayment is TikTok's standard event for a completed transaction
  // -- the closest analog to GA4's purchase / Meta's Purchase here.
  ttqTrack("CompletePayment", {
    content_id: String(order.id),
    contents: ga4Items.map((item) => ({ content_id: item.item_id, quantity: item.quantity, price: item.price })),
    currency: CURRENCY,
    value: order.total,
  });
}
