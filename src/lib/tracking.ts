import type { CartAddableProduct } from "@/context/CartContext";
import type { CartItem } from "@/context/CartContext";
import type { Order, PaymentMethod, Product } from "./types";
import { loadAuth } from "./storedState.ts";
import { buildContactHashes, buildUserData, type Buyer, type ContactUserData, type MetaUserData } from "./userData.ts";

// All three platforms' scripts are injected conditionally (only when an
// admin has actually set that ID -- see layout.tsx), so every function here
// has to be a safe no-op when the underlying script never loaded. That's
// the whole point: this module can be called unconditionally from anywhere
// in the app without knowing whether tracking is configured.
//
// Every event pushed to the data layer carries an `event_id` (docs/tracking-spec.md): the browser tags send it with their event, and the
// server container forwards it to Meta's Conversions API, which counts the browser event and the server event once when the name and the
// id are the same. Purchase uses `order-<order number>`, which the shop's own server computes too.

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    ttq?: {
      track: (event: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void;
      page: () => void;
    };
  }
}

const CURRENCY = "BDT";

// When a Google Tag Manager container is set in Marketing Settings, GTM owns every browser tag (GA4, the Meta pixel, the TikTok
// pixel): this site then only fills the data layer and never calls fbq(), ttq() or gtag() itself, so nothing can be counted twice.
// Without a GTM container the pixels are loaded and called directly, as before. The page's consent script (consentBootstrap.ts)
// records which mode the page was built for.
export function gtmOwnsBrowserTags(): boolean {
  return typeof window !== "undefined" && Boolean(window.anaizaConsent?.config?.gtm);
}

/** 16 random characters (lower-case hex) for an event id. */
function randomPart(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  let text = "";
  while (text.length < 16) text += Math.floor(Math.random() * 16).toString(16);

  return text;
}

/** `<event>.<16 random characters>`, made when the event is pushed. */
export function newEventId(event: string): string {
  return `${event}.${randomPart()}`;
}

/** Pushes one event and returns its event_id (the one given, else a new one). The previous ecommerce object and hashed contact are cleared first. */
function pushDataLayer(event: { event: string; event_id?: string } & Record<string, unknown>): string {
  const { event: name, event_id: given, ...rest } = event;
  const eventId = given ?? newEventId(name);

  if (typeof window === "undefined") return eventId;
  window.dataLayer = window.dataLayer || [];
  // Clear the previous ecommerce object first -- Google's own recommended pattern, so object fields don't merge across events -- and the
  // hashed contact details (user_data), which the data layer would otherwise keep for every later event of the visit.
  window.dataLayer.push({ ecommerce: null, user_data: null });
  window.dataLayer.push({ event: name, event_id: eventId, ...rest });

  return eventId;
}

// eventId, when passed, lets Meta/TikTok deduplicate this client-side pixel
// event against the matching server-side Conversions/Events API call for
// the same action (see SendMetaConversionEvent/SendTikTokConversionEvent on
// the backend, which must be sent the identical id).
function fbqTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function" || gtmOwnsBrowserTags()) return;
  if (eventId) {
    window.fbq("track", event, params, { eventID: eventId });
  } else {
    window.fbq("track", event, params);
  }
}

function ttqTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || typeof window.ttq === "undefined" || gtmOwnsBrowserTags()) return;
  window.ttq.track(event, params, eventId ? { event_id: eventId } : undefined);
}

/**
 * A page of the visit. Pushed to the data layer for every page, the first one included (once each): with a GTM container the Meta tag and the
 * GA4 page_view tag fire on it, with this event's id, so the server container can deduplicate the page view too.
 * Direct mode also calls fbq PageView / ttq.page() for a page change (the base install snippets already fired for the first page).
 */
export function trackPageView(referrer = "", first = false) {
  if (typeof window === "undefined") return;

  const eventId = pushDataLayer({
    event: "page_view",
    page_location: window.location?.href ?? "",
    page_path: window.location?.pathname ?? "",
    page_title: typeof document === "undefined" ? "" : document.title,
    page_referrer: referrer,
  });

  if (gtmOwnsBrowserTags() || first) return;

  fbqTrack("PageView", undefined, eventId);
  if (typeof window.ttq !== "undefined") {
    window.ttq.page();
  }
}

// The id every platform knows a product by: the same one the product feeds use (the SKU, else the product id), so a
// dynamic ad and a pixel event point at the same catalogue item. A variant with a SKU of its own is its own item in the
// feeds, so it is reported by that SKU; a variant sharing the product's SKU (or with none) is the product.
export function feedItemId(product: { id: number; sku?: string | null }, variant?: { sku?: string | null } | null): string {
  const own = product.sku?.trim() || null;
  const variantSku = variant?.sku?.trim() || null;

  if (variantSku && variantSku !== own) return variantSku;

  return own ?? String(product.id);
}

// The same id for a cart line or an order line, which hold the SKU of the exact piece (the variant's, when it has one).
function lineItemId(line: { sku?: string | null }, productId: number): string {
  return line.sku?.trim() || String(productId);
}

/** One item as GA4 and the server container read it: item_id (the SKU), item_name, price, quantity, and item_category when known. */
function lineItem(id: string, name: string, price: number, quantity: number, category?: string | null) {
  return { item_id: id, item_name: name, price, quantity, ...(category ? { item_category: category } : {}) };
}

type TrackedProduct = { sku?: string | null; id: number; name: string; effective_price?: number; price?: number; category?: { name: string } | null; variants?: { sku?: string | null }[] };

// What the product page has selected when it opens: the first variant, as the page itself does.
function pageVariant(product: TrackedProduct) {
  return product.variants?.[0] ?? null;
}

function ga4Item(product: TrackedProduct, quantity = 1, variant: { sku?: string | null } | null = pageVariant(product)) {
  return lineItem(feedItemId(product, variant), product.name, product.effective_price ?? product.price ?? 0, quantity, product.category?.name);
}

const cartLineItem = (item: CartItem) => lineItem(lineItemId(item, item.productId), item.name, item.price, item.quantity, item.category);

export function trackViewItem(product: Product) {
  const eventId = pushDataLayer({
    event: "view_item",
    ecommerce: {
      currency: CURRENCY,
      value: product.effective_price,
      items: [ga4Item(product)],
    },
  });
  fbqTrack(
    "ViewContent",
    {
      content_ids: [feedItemId(product, pageVariant(product))],
      content_name: product.name,
      content_type: "product",
      currency: CURRENCY,
      value: product.effective_price,
    },
    eventId,
  );
  ttqTrack(
    "ViewContent",
    {
      content_id: feedItemId(product, pageVariant(product)),
      content_name: product.name,
      content_type: "product",
      currency: CURRENCY,
      value: product.effective_price,
    },
    eventId,
  );
}

// The products a landing page puts in front of the visitor, as the ids the feeds use (a variant with its own SKU is its
// own item, exactly as on a product page). One ViewContent for the page, listing every product on it.
export function viewContentListPayload(products: Product[]) {
  const items = products.map((product) => ({
    id: feedItemId(product, pageVariant(product)),
    name: product.name,
    price: product.effective_price,
  }));

  return {
    content_ids: items.map((item) => item.id),
    contents: items.map((item) => ({ id: item.id, quantity: 1, item_price: item.price })),
    content_type: "product" as const,
    currency: CURRENCY,
    // The cheapest piece: a landing page does not know yet which one will be chosen.
    value: items.length > 0 ? Math.min(...items.map((item) => item.price)) : 0,
  };
}

export function trackViewContentList(products: Product[], listName: string) {
  if (products.length === 0) return;

  const payload = viewContentListPayload(products);

  const eventId = pushDataLayer({
    event: "view_item_list",
    ecommerce: {
      item_list_name: listName,
      currency: CURRENCY,
      items: products.map((p) => ga4Item(p)),
    },
  });
  fbqTrack("ViewContent", payload, eventId);
  ttqTrack(
    "ViewContent",
    {
      contents: payload.contents.map((item) => ({ content_id: item.id, quantity: item.quantity, price: item.item_price })),
      content_type: "product",
      currency: CURRENCY,
      value: payload.value,
    },
    eventId,
  );
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

// The cart page, when it has something in it.
export function trackViewCart(items: CartItem[], value: number) {
  if (items.length === 0) return;
  pushDataLayer({
    event: "view_cart",
    ecommerce: {
      currency: CURRENCY,
      value,
      items: items.map(cartLineItem),
    },
  });
}

// A search on the shop page (the term as typed, trimmed). GA4's own `search` event; the pixels have no equivalent we use.
export function trackSearch(term: string) {
  const clean = term.trim();
  if (clean === "") return;
  pushDataLayer({ event: "search", search_term: clean });
}

export function trackAddToCart(product: CartAddableProduct, quantity: number, variant: { sku?: string | null } | null = null) {
  const value = product.effective_price * quantity;
  const id = feedItemId(product, variant);
  const eventId = pushDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: CURRENCY,
      value,
      items: [{ ...ga4Item(product, quantity, variant), item_id: id }],
    },
  });
  fbqTrack(
    "AddToCart",
    {
      content_ids: [id],
      content_name: product.name,
      content_type: "product",
      currency: CURRENCY,
      value,
    },
    eventId,
  );
  ttqTrack(
    "AddToCart",
    {
      content_id: id,
      content_name: product.name,
      content_type: "product",
      currency: CURRENCY,
      value,
    },
    eventId,
  );
}

export function trackRemoveFromCart(item: CartItem) {
  pushDataLayer({
    event: "remove_from_cart",
    ecommerce: {
      currency: CURRENCY,
      value: item.price * item.quantity,
      items: [cartLineItem(item)],
    },
  });
}

// Whether marketing cookies and pixels may be used right now: the visitor's saved choice, or the default for the cookie
// mode (everything in notice mode, nothing in opt-in mode until they choose). Mirrors marketingAllowed() in consent.ts.
function marketingAllowedNow(): boolean {
  return typeof window === "undefined" ? false : window.anaizaConsent ? window.anaizaConsent.effective().m : true;
}

/** The id of the customer who is signed in on this browser, or null (a guest). */
export function signedInCustomerId(): number | null {
  try {
    return loadAuth(window.localStorage)?.customer.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The hashed email, phone and external id of the buyer for the data layer, or null: when marketing is not allowed (nothing is hashed or pushed at
 * all), when the page knows nothing about the buyer yet, or when the browser cannot hash. Never a raw value.
 */
async function contactForDataLayer(buyer: Buyer | null | undefined): Promise<ContactUserData | null> {
  if (!buyer || !marketingAllowedNow()) return null;

  return buildContactHashes(buyer).catch(() => null);
}

/** Runs `push` now when there is nothing to hash, else once the hashes are ready (a few milliseconds later). */
function withContact(buyer: Buyer | null | undefined, push: (userData: ContactUserData | null) => void) {
  if (!buyer || !marketingAllowedNow()) return push(null);

  void contactForDataLayer(buyer).then(push);
}

export function trackBeginCheckout(items: CartItem[], value: number, buyer?: Buyer | null) {
  if (items.length === 0) return;
  const ga4Items = items.map(cartLineItem);

  withContact(buyer, (userData) => {
    const eventId = pushDataLayer({
      event: "begin_checkout",
      ecommerce: { currency: CURRENCY, value, items: ga4Items },
      ...(userData ? { user_data: userData } : {}),
    });
    fbqTrack(
      "InitiateCheckout",
      {
        content_ids: ga4Items.map((item) => item.item_id),
        contents: ga4Items.map((item) => ({ id: item.item_id, quantity: item.quantity })),
        currency: CURRENCY,
        value,
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      eventId,
    );
    ttqTrack(
      "InitiateCheckout",
      {
        contents: ga4Items.map((item) => ({ content_id: item.item_id, quantity: item.quantity, price: item.price })),
        currency: CURRENCY,
        value,
      },
      eventId,
    );
  });
}

export function trackAddShippingInfo(items: CartItem[], value: number, shippingTier: string) {
  pushDataLayer({
    event: "add_shipping_info",
    ecommerce: {
      currency: CURRENCY,
      value,
      shipping_tier: shippingTier,
      items: items.map(cartLineItem),
    },
  });
}

export function trackAddPaymentInfo(items: CartItem[], value: number, paymentMethod: PaymentMethod, buyer?: Buyer | null) {
  withContact(buyer, (userData) => {
    pushDataLayer({
      event: "add_payment_info",
      ecommerce: {
        currency: CURRENCY,
        value,
        payment_type: paymentMethod,
        items: items.map(cartLineItem),
      },
      ...(userData ? { user_data: userData } : {}),
    });
  });
}

// bKash, Nagad and Rocket orders are paid by sending money and having the shop confirm it (see the payment
// settings). They are not a sale until that is confirmed.
function isWalletOrder(order: Order): boolean {
  return order.payment_method === "bkash" || order.payment_method === "nagad" || order.payment_method === "rocket";
}

// Meta advanced matching: the same hashed fields as the server's Purchase event, handed to the pixel just before it (direct mode only).
function fbqAdvancedMatching(userData: MetaUserData) {
  const pixelId = typeof window === "undefined" ? null : (window.anaizaConsent?.config?.meta ?? null);
  if (!pixelId || typeof window.fbq !== "function" || gtmOwnsBrowserTags()) return;
  window.fbq("init", pixelId, userData);
}

/**
 * What a purchase is worth to GA4, Meta and TikTok: the items total after any discount, WITHOUT the delivery fee (that goes in `shipping`).
 * The order's total is items + delivery - discount, so the items total after discount is total - delivery.
 */
export function purchaseValue(order: Pick<Order, "total" | "delivery_fee">): number {
  return Math.max(0, order.total - order.delivery_fee);
}

// Cash on delivery counts as a sale when it is placed. A wallet order does not: a payment that cannot be matched
// must never show up as revenue. So for a wallet order this reports only that an order is waiting for its payment
// (no value, no items, nothing a platform could read as a purchase), and the shop's server sends the Purchase to Meta
// and TikTok itself once the payment has been verified.
export async function trackPurchase(order: Order): Promise<void> {
  if (isWalletOrder(order)) {
    pushDataLayer({
      event: "order_pending_payment",
      order_id: String(order.id),
      payment_type: order.payment_method,
    });
    return;
  }

  const buyer: Buyer = { email: order.customer.email, phone: order.customer.phone, customerId: signedInCustomerId() };

  // Hashed (SHA-256) in the browser, only when the visitor's cookie choice allows marketing: never a raw email or phone number.
  const userData = await contactForDataLayer(buyer);
  // Direct mode only: Meta's fuller advanced matching for the pixel itself (name, city, region too), never put in the data layer.
  const pixelMatching = marketingAllowedNow() && !gtmOwnsBrowserTags() ? await buildUserData(order.customer).catch(() => null) : null;

  const ga4Items = order.items.map((item) => lineItem(lineItemId(item, item.product_id), item.product_name, item.price, item.quantity, item.category));
  const value = purchaseValue(order);

  // Must match the event_id the backend sends for this order's server-side
  // Meta Conversions API / TikTok Events API call (see
  // SendMetaConversionEvent/SendTikTokConversionEvent), so the platforms
  // dedupe the client and server events instead of double-counting the sale.
  const eventId = `order-${order.id}`;

  pushDataLayer({
    event: "purchase",
    // The same id the shop's server sends with its Meta / TikTok purchase, so the platforms count the sale once. A GTM Meta or
    // TikTok purchase tag must send exactly this as its event id.
    event_id: eventId,
    ecommerce: {
      transaction_id: String(order.id),
      value,
      currency: CURRENCY,
      shipping: order.delivery_fee,
      items: ga4Items,
    },
    ...(userData ? { user_data: userData } : {}),
  });
  if (pixelMatching) fbqAdvancedMatching(pixelMatching.meta);
  fbqTrack(
    "Purchase",
    {
      content_ids: ga4Items.map((item) => item.item_id),
      content_type: "product",
      contents: ga4Items.map((item) => ({ id: item.item_id, quantity: item.quantity })),
      currency: CURRENCY,
      value,
    },
    eventId,
  );
  // CompletePayment is TikTok's standard event for a completed transaction
  // -- the closest analog to GA4's purchase / Meta's Purchase here.
  ttqTrack(
    "CompletePayment",
    {
      content_type: "product",
      contents: ga4Items.map((item) => ({ content_id: item.item_id, quantity: item.quantity, price: item.price })),
      currency: CURRENCY,
      value,
    },
    eventId,
  );
}
