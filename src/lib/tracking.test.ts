// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { feedItemId, newEventId, purchaseValue, trackAddPaymentInfo, trackAddShippingInfo, trackAddToCart, trackBeginCheckout, trackPageView, trackPurchase, trackRemoveFromCart, trackSearch, trackViewCart, trackViewContentList, trackViewItem, trackViewItemList } from "./tracking.ts";
import type { Order } from "./types.ts";

type Call = unknown[];

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const fbqCalls: Call[] = [];
const ttqCalls: Call[] = [];
const win = globalThis as unknown as { window?: Record<string, unknown> };
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function order(paymentMethod: string): Order {
  return {
    id: 42,
    status: "pending",
    payment_method: paymentMethod,
    subtotal: 600,
    delivery_fee: 80,
    total: 680,
    gift_note: null,
    created_at: "2026-10-06T00:00:00Z",
    customer: {
      id: 1,
      name: "Nusrat Jahan",
      email: "Nusrat.Jahan@Gmail.com",
      phone: "01712345678",
      address: "House 1",
      division: "Dhaka",
      district: "Dhaka",
      thana: "Banani",
    },
    items: [{ id: 1, product_id: 7, product_name: "Mug", quantity: 1, price: 600, variant_name: null, variant_value: null, sku: "M-1", category: "Mugs" }],
  } as unknown as Order;
}

/** The events (not the clearing entries that go before them). */
const layer = () => (win.window?.dataLayer as Record<string, unknown>[]).filter((entry) => entry.event);

/** A page as the consent script leaves it: optional consent state, and the Meta pixel ID it was built with. */
function setUpPage(consent?: { marketing: boolean }) {
  fbqCalls.length = 0;
  ttqCalls.length = 0;
  win.window = {
    dataLayer: [],
    fbq: (...args: unknown[]) => fbqCalls.push(args),
    ttq: { track: (...args: unknown[]) => ttqCalls.push(args), page: () => undefined },
    ...(consent
      ? { anaizaConsent: { config: { meta: "111222333" }, effective: () => ({ a: consent.marketing, m: consent.marketing }) } }
      : { anaizaConsent: { config: { meta: "111222333" }, effective: () => ({ a: true, m: true }) } }),
  };
}

beforeEach(() => setUpPage());

describe("trackPurchase: cash on delivery", () => {
  it("counts the order as a sale in GA4, Meta and TikTok at placement", async () => {
    await trackPurchase(order("cod"));

    assert.deepEqual(layer().map((entry) => entry.event), ["purchase"]);
    assert.equal(fbqCalls.filter((call) => call[1] === "Purchase").length, 1);
    assert.deepEqual(fbqCalls.find((call) => call[1] === "Purchase")?.[3], { eventID: "order-42" });
    assert.equal(ttqCalls.length, 1);
    assert.equal(ttqCalls[0][0], "CompletePayment");
  });

  it("adds the hashed email, phone and external id to the purchase: SHA-256, the phone as 8801XXXXXXXXX, nothing else", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { user_data?: unknown };
    assert.deepEqual(purchase.user_data, {
      sha256_email_address: sha("nusrat.jahan@gmail.com"),
      sha256_phone_number: sha("8801712345678"),
      external_id: sha("8801712345678"),
    });
  });

  it("uses the signed-in customer's id for external_id, and the phone for a guest", async () => {
    (win.window as Record<string, unknown>).localStorage = {
      getItem: () => JSON.stringify({ customer: { id: 9, name: "N", email: "n@example.test", phone: "01712345678" }, token: "t" }),
    };
    await trackPurchase(order("cod"));

    assert.equal(((layer()[0] as { user_data: { external_id: string } }).user_data).external_id, sha("9"));
  });

  it("never pushes a raw email, phone number, name or address", async () => {
    await trackPurchase(order("cod"));

    const everything = JSON.stringify(win.window?.dataLayer);
    for (const raw of ["Nusrat", "nusrat", "Jahan", "gmail", "01712345678", "8801712345678", "House 1", "Banani", "+880"]) {
      assert.ok(!everything.includes(raw), `${raw} must not appear in the data layer`);
    }
  });

  it("gives Meta's pixel the fuller hashed advanced matching just before the Purchase (direct mode only)", async () => {
    await trackPurchase(order("cod"));

    const init = fbqCalls.findIndex((call) => call[0] === "init");
    const purchase = fbqCalls.findIndex((call) => call[1] === "Purchase");
    assert.ok(init >= 0 && init < purchase, "init with user data comes before Purchase");
    assert.deepEqual(fbqCalls[init], [
      "init",
      "111222333",
      { em: sha("nusrat.jahan@gmail.com"), ph: sha("8801712345678"), fn: sha("nusrat"), ln: sha("jahan"), ct: sha("dhaka"), st: sha("dhaka"), country: sha("bd") },
    ]);
  });
});

describe("the purchase value: the items total after discount, without delivery", () => {
  it("is the order's total minus its delivery fee, in GA4, Meta and TikTok, with the fee in shipping", async () => {
    const discounted = order("cod");
    // Items 1,000, a coupon of 100 off, delivery 80: the order total is 980.
    Object.assign(discounted, { subtotal: 1000, discount_amount: 100, delivery_fee: 80, total: 980 });

    await trackPurchase(discounted);

    const purchase = layer()[0] as { ecommerce: { value: number; shipping: number; transaction_id: string; currency: string } };
    assert.deepEqual([purchase.ecommerce.value, purchase.ecommerce.shipping, purchase.ecommerce.currency], [900, 80, "BDT"]);
    assert.equal((fbqCalls.find((call) => call[1] === "Purchase")?.[2] as { value: number }).value, 900);
    assert.equal((ttqCalls[0][1] as { value: number }).value, 900);
    assert.equal(purchaseValue(discounted), 900);
  });

  it("is a number and never negative", () => {
    assert.equal(purchaseValue({ total: 680, delivery_fee: 80 }), 600);
    assert.equal(purchaseValue({ total: 50, delivery_fee: 80 }), 0);
  });

  it("gives Meta the product ids (the SKUs) and content_type product", async () => {
    await trackPurchase(order("cod"));

    const meta = fbqCalls.find((call) => call[1] === "Purchase")?.[2] as { content_ids: string[]; content_type: string };
    assert.deepEqual([meta.content_ids, meta.content_type], [["M-1"], "product"]);
  });

  it("describes every item as item_id (SKU), item_name, price, quantity and item_category", async () => {
    await trackPurchase(order("cod"));

    assert.deepEqual((layer()[0] as { ecommerce: { items: unknown[] } }).ecommerce.items, [{ item_id: "M-1", item_name: "Mug", price: 600, quantity: 1, item_category: "Mugs" }]);
  });
});

describe("trackPurchase: cookie consent", () => {
  it("in opt-in mode with consent, sends the hashed data", async () => {
    setUpPage({ marketing: true });

    await trackPurchase(order("cod"));

    assert.ok((layer()[0] as { user_data?: unknown }).user_data);
    assert.ok(fbqCalls.some((call) => call[0] === "init"));
  });

  it("in opt-in mode without consent, pushes nothing about the buyer", async () => {
    setUpPage({ marketing: false });

    await trackPurchase(order("cod"));

    assert.equal("user_data" in layer()[0], false);
    assert.equal(fbqCalls.some((call) => call[0] === "init"), false);
    assert.equal(JSON.stringify(win.window?.dataLayer).includes("sha256"), false);
  });

  it("with no consent script at all (nothing configured), behaves as notice mode", async () => {
    setUpPage();
    delete win.window?.anaizaConsent;

    await trackPurchase(order("cod"));

    assert.ok((layer()[0] as { user_data?: unknown }).user_data);
  });
});

describe("trackPurchase: wallet payments", () => {
  it("counts no wallet order as a sale: only a non-revenue pending event", async () => {
    for (const method of ["bkash", "nagad", "rocket"]) {
      setUpPage();

      await trackPurchase(order(method));

      const [pending] = layer();
      assert.equal(layer().length, 1, method);
      assert.deepEqual({ ...pending, event_id: undefined }, { event: "order_pending_payment", event_id: undefined, order_id: "42", payment_type: method }, method);
      assert.equal(fbqCalls.length, 0, `${method}: nothing to Meta`);
      assert.equal(ttqCalls.length, 0, `${method}: nothing to TikTok`);
    }
  });

  it("puts no revenue, no items, no buyer data and no purchase event in a wallet order's events", async () => {
    await trackPurchase(order("bkash"));

    const everything = JSON.stringify(layer());
    for (const forbidden of ['"purchase"', "value", "items", "680", "sha256", "user_data"]) {
      assert.ok(!everything.includes(forbidden), `${forbidden} must not appear`);
    }
  });
});

// What a dynamic ad matches on is the feed's id: the SKU, else the product id; a variant with its own SKU is its own item.
describe("ids match the product feeds", () => {
  const product = { id: 7, sku: "MUG-RED", name: "Red mug", effective_price: 600, variants: [] as { sku: string }[] };

  it("uses the SKU, else the product id", () => {
    assert.equal(feedItemId({ id: 7, sku: "MUG-RED" }), "MUG-RED");
    assert.equal(feedItemId({ id: 7, sku: "  MUG-RED " }), "MUG-RED");
    assert.equal(feedItemId({ id: 7, sku: "" }), "7");
    assert.equal(feedItemId({ id: 7, sku: null }), "7");
  });

  it("uses a variant's own SKU, and the product's when the variant shares it or has none", () => {
    assert.equal(feedItemId({ id: 7, sku: "MUG" }, { sku: "MUG-BLUE" }), "MUG-BLUE");
    assert.equal(feedItemId({ id: 7, sku: "MUG" }, { sku: "MUG" }), "MUG");
    assert.equal(feedItemId({ id: 7, sku: "MUG" }, { sku: null }), "MUG");
    assert.equal(feedItemId({ id: 7, sku: "" }, { sku: "" }), "7");
  });

  it("reports the same id to the data layer, Meta and TikTok when a product is viewed", () => {
    trackViewItem({ ...product, variants: [{ sku: "MUG-RED-L" }] } as never);

    const view = layer()[0] as { ecommerce: { items: { item_id: string }[] } };
    assert.equal(view.ecommerce.items[0].item_id, "MUG-RED-L");
    assert.deepEqual((fbqCalls.find((c) => c[1] === "ViewContent")?.[2] as { content_ids: string[] }).content_ids, ["MUG-RED-L"]);
    assert.equal((ttqCalls.find((c) => c[0] === "ViewContent")?.[1] as { content_id: string }).content_id, "MUG-RED-L");
  });

  it("reports the variant's SKU on add to cart, everywhere", () => {
    trackAddToCart({ id: 7, sku: "MUG", slug: "mug", name: "Mug", effective_price: 600, stock_quantity: 5 }, 2, { sku: "MUG-BLUE" });

    const add = layer()[0] as { ecommerce: { items: { item_id: string; quantity: number }[] } };
    assert.deepEqual([add.ecommerce.items[0].item_id, add.ecommerce.items[0].quantity], ["MUG-BLUE", 2]);
    assert.deepEqual((fbqCalls.find((c) => c[1] === "AddToCart")?.[2] as { content_ids: string[] }).content_ids, ["MUG-BLUE"]);
    assert.equal((ttqCalls.find((c) => c[0] === "AddToCart")?.[1] as { content_id: string }).content_id, "MUG-BLUE");
  });

  it("falls back to the product id on add to cart when there is no SKU", () => {
    trackAddToCart({ id: 7, sku: "", slug: "mug", name: "Mug", effective_price: 600, stock_quantity: 5 }, 1);

    assert.deepEqual((fbqCalls.find((c) => c[1] === "AddToCart")?.[2] as { content_ids: string[] }).content_ids, ["7"]);
  });

  it("reports cart lines by their SKU at checkout", () => {
    trackBeginCheckout(
      [{ key: "7:base", productId: 7, slug: "mug", name: "Mug", price: 600, image: null, variantId: null, variantLabel: null, sku: "MUG-RED", quantity: 1, stock: 5 }],
      600,
    );

    assert.deepEqual((fbqCalls.find((c) => c[1] === "InitiateCheckout")?.[2] as { content_ids: string[] }).content_ids, ["MUG-RED"]);
  });

  it("reports an order's SKU on purchase to the data layer, Meta and TikTok", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { ecommerce: { items: { item_id: string }[] } };
    assert.equal(purchase.ecommerce.items[0].item_id, "M-1");
    assert.deepEqual((fbqCalls.find((c) => c[1] === "Purchase")?.[2] as { content_ids: string[] }).content_ids, ["M-1"]);
    const complete = ttqCalls.find((c) => c[0] === "CompletePayment")?.[1] as { contents: { content_id: string }[]; content_id?: string };
    assert.equal(complete.contents[0].content_id, "M-1");
    assert.equal("content_id" in complete, false, "an order id is not a catalogue id");
  });

  it("falls back to the product id for an order line with no SKU", async () => {
    const noSku = order("cod");
    noSku.items[0].sku = null;

    await trackPurchase(noSku);

    assert.equal((layer()[0] as { ecommerce: { items: { item_id: string }[] } }).ecommerce.items[0].item_id, "7");
  });
});

// ---- event_id on every event (docs/tracking-spec.md)

const cartLine = { key: "7:base", productId: 7, slug: "mug", name: "Mug", price: 600, image: null, variantId: null, variantLabel: null, sku: "MUG-RED", category: "Mugs", quantity: 2, stock: 5 };
const product = { id: 7, sku: "MUG-RED", slug: "mug", name: "Red mug", effective_price: 600, stock_quantity: 5, category: { name: "Mugs" }, variants: [] };

describe("event_id: every event the shop pushes has its own", () => {
  const EVENT_ID = /^[a-z_]+\.[0-9a-f]{16}$/;

  it("is <event>.<16 characters>, made when the event is pushed", () => {
    assert.match(newEventId("add_to_cart"), /^add_to_cart\.[0-9a-f]{16}$/);
    assert.notEqual(newEventId("x"), newEventId("x"));
  });

  it("is on page_view, view_item_list, view_item, search, add_to_cart, remove_from_cart, view_cart, begin_checkout, add_shipping_info and add_payment_info, all different", async () => {
    trackPageView("https://example.test/", true);
    trackViewItemList([product as never], "Shop");
    trackViewContentList([product as never], "Landing page: spring");
    trackViewItem(product as never);
    trackSearch("tea");
    trackAddToCart(product, 1);
    trackRemoveFromCart(cartLine);
    trackViewCart([cartLine], 1200);
    trackBeginCheckout([cartLine], 1200);
    trackAddShippingInfo([cartLine], 1200, "Inside Dhaka");
    trackAddPaymentInfo([cartLine], 1200, "cod");
    await trackPurchase(order("cod"));
    await trackPurchase({ ...order("bkash"), id: 43 });

    const events = layer();
    assert.deepEqual(
      events.map((entry) => entry.event),
      ["page_view", "view_item_list", "view_item_list", "view_item", "search", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase", "order_pending_payment"],
    );
    for (const entry of events) assert.ok(typeof entry.event_id === "string" && entry.event_id !== "", `${String(entry.event)} has an event_id`);
    assert.equal(new Set(events.map((entry) => entry.event_id)).size, events.length, "no two events share an id");
    for (const entry of events.filter((item) => item.event !== "purchase")) assert.match(String(entry.event_id), EVENT_ID, String(entry.event));
  });

  it("is the same id the pixel is sent in direct mode (Meta's eventID, TikTok's event_id)", () => {
    trackAddToCart(product, 1);

    const id = (layer()[0] as { event_id: string }).event_id;
    assert.deepEqual(fbqCalls.find((call) => call[1] === "AddToCart")?.[3], { eventID: id });
    assert.deepEqual(ttqCalls.find((call) => call[0] === "AddToCart")?.[2], { event_id: id });
  });

  it("is order-<number> for the purchase, exactly, and the same on every platform", async () => {
    await trackPurchase(order("cod"));

    assert.equal((layer()[0] as { event_id: string }).event_id, "order-42");
    assert.deepEqual(fbqCalls.find((call) => call[1] === "Purchase")?.[3], { eventID: "order-42" });
    assert.deepEqual(ttqCalls.find((call) => call[0] === "CompletePayment")?.[2], { event_id: "order-42" });
  });

  it("clears the previous ecommerce object and hashed details before each event", () => {
    trackAddToCart(product, 1);

    const entries = win.window?.dataLayer as Record<string, unknown>[];
    assert.deepEqual(entries[0], { ecommerce: null, user_data: null });
    assert.equal(entries[1].event, "add_to_cart");
  });
});

describe("the item shape: item_id (SKU), item_name, price, quantity, item_category", () => {
  it("is the same on a product event, a cart event and an order line", async () => {
    trackAddToCart(product, 2);
    trackRemoveFromCart(cartLine);

    const [add, remove] = layer() as { ecommerce: { items: unknown[] } }[];
    assert.deepEqual(add.ecommerce.items, [{ item_id: "MUG-RED", item_name: "Red mug", price: 600, quantity: 2, item_category: "Mugs" }]);
    assert.deepEqual(remove.ecommerce.items, [{ item_id: "MUG-RED", item_name: "Mug", price: 600, quantity: 2, item_category: "Mugs" }]);
  });

  it("leaves item_category out for a cart saved before it was kept", () => {
    trackViewCart([{ ...cartLine, category: undefined }], 1200);

    assert.deepEqual((layer()[0] as { ecommerce: { items: unknown[] } }).ecommerce.items, [{ item_id: "MUG-RED", item_name: "Mug", price: 600, quantity: 2 }]);
  });
});

// ---- Page views

describe("page_view", () => {
  it("is pushed for the first page too, with the address, title and referrer, and an event_id", () => {
    (win.window as Record<string, unknown>).location = { href: "https://anaizanest.com/shop", pathname: "/shop" };
    (globalThis as unknown as { document?: unknown }).document = { title: "Shop | Anaiza Nest" };

    trackPageView("https://www.google.com/", true);

    const [pageView] = layer() as Record<string, string>[];
    assert.deepEqual(
      { ...pageView, event_id: "x" },
      { event: "page_view", event_id: "x", page_location: "https://anaizanest.com/shop", page_path: "/shop", page_title: "Shop | Anaiza Nest", page_referrer: "https://www.google.com/" },
    );
    assert.match(pageView.event_id, /^page_view\.[0-9a-f]{16}$/);
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it("direct mode: the first page calls no pixel (the base snippets did), a page change calls fbq PageView and ttq.page with the event id", () => {
    let ttqPages = 0;
    (win.window as { ttq: { page: () => void } }).ttq.page = () => ttqPages++;

    trackPageView("", true);
    assert.equal(fbqCalls.length + ttqPages, 0);

    trackPageView("https://anaizanest.com/shop", false);
    assert.equal(ttqPages, 1);
    assert.deepEqual(fbqCalls.find((call) => call[1] === "PageView")?.[3], { eventID: (layer()[1] as { event_id: string }).event_id });
  });
});

// ---- The hashed details on begin_checkout and add_payment_info

describe("user_data on begin_checkout and add_payment_info", () => {
  const buyer = { email: " Nusrat.Jahan@Gmail.com ", phone: "+880 1712-345678", customerId: null };

  it("carries the SHA-256 of the email (trimmed, lower case), the phone as 8801XXXXXXXXX, and the phone's hash as the guest's external_id", async () => {
    trackBeginCheckout([cartLine], 1200, buyer);
    trackAddPaymentInfo([cartLine], 1200, "cod", buyer);
    await settle();

    const expected = { sha256_email_address: sha("nusrat.jahan@gmail.com"), sha256_phone_number: sha("8801712345678"), external_id: sha("8801712345678") };
    assert.deepEqual(layer().map((entry) => entry.event), ["begin_checkout", "add_payment_info"]);
    for (const entry of layer()) assert.deepEqual(entry.user_data, expected);
  });

  it("uses the customer id as external_id for a signed-in customer", async () => {
    trackBeginCheckout([cartLine], 1200, { ...buyer, customerId: 31 });
    await settle();

    assert.equal(((layer()[0] as { user_data: { external_id: string } }).user_data).external_id, sha("31"));
  });

  it("sends what it has: a phone alone, an email alone, and nothing at all when there is nothing usable", async () => {
    trackBeginCheckout([cartLine], 1200, { phone: "01712345678" });
    trackBeginCheckout([cartLine], 1200, { email: "a@example.test" });
    trackBeginCheckout([cartLine], 1200, { email: "not an email", phone: "12345" });
    trackBeginCheckout([cartLine], 1200);
    await settle();

    // The two with something to hash arrive a moment later than the two without, so the order is not the order they were asked in.
    const shapes = layer().map((entry) => Object.keys((entry.user_data as object | undefined) ?? {}).sort().join(","));
    assert.deepEqual(shapes.sort(), ["", "", "external_id,sha256_phone_number", "sha256_email_address"]);
  });

  it("pushes no user_data, and does not even hash, when marketing is not allowed", async () => {
    setUpPage({ marketing: false });

    trackBeginCheckout([cartLine], 1200, buyer);
    trackAddPaymentInfo([cartLine], 1200, "cod", buyer);
    await settle();

    assert.deepEqual(layer().map((entry) => entry.event), ["begin_checkout", "add_payment_info"]);
    for (const entry of layer()) assert.equal("user_data" in entry, false);
    assert.equal(JSON.stringify(win.window?.dataLayer).includes("sha256"), false);
  });

  it("never puts a raw email or phone anywhere in the data layer", async () => {
    trackBeginCheckout([cartLine], 1200, buyer);
    trackAddPaymentInfo([cartLine], 1200, "cod", buyer);
    await settle();

    const everything = JSON.stringify(win.window?.dataLayer);
    for (const raw of ["Nusrat", "nusrat.jahan", "gmail", "1712", "01712345678", "+880"]) assert.ok(!everything.includes(raw), `${raw} must not appear`);
  });

  it("the next event does not carry the previous event's details (they are cleared first)", async () => {
    trackBeginCheckout([cartLine], 1200, buyer);
    await settle();
    trackAddShippingInfo([cartLine], 1200, "Inside Dhaka");

    const entries = win.window?.dataLayer as Record<string, unknown>[];
    const shipping = entries.findIndex((entry) => entry.event === "add_shipping_info");
    assert.deepEqual(entries[shipping - 1], { ecommerce: null, user_data: null });
  });
});

// ---- One owner for the browser tags (see consentBootstrap.ts). With a GTM container the site only fills the data layer; without one it
// ---- keeps calling the pixels itself. Either way the data layer carries the same events.

/** A page built with a GTM container: the pixels, if the container's tags have defined them, must never be called by the site. */
function setUpGtmPage() {
  setUpPage();
  (win.window as Record<string, unknown>).anaizaConsent = { config: { meta: null, gtm: "GTM-TESTCONT" }, effective: () => ({ a: true, m: true }) };
  (win.window as Record<string, unknown>).location = { href: "https://anaizanest.com/shop", pathname: "/shop" };
}

describe("GTM mode: the site never calls a pixel itself", () => {
  beforeEach(() => setUpGtmPage());

  it("pushes the purchase to the data layer and calls neither fbq nor ttq, even though a container's tag has defined them", async () => {
    await trackPurchase(order("cod"));

    assert.deepEqual(layer().map((entry) => entry.event), ["purchase"]);
    assert.deepEqual(fbqCalls, []);
    assert.deepEqual(ttqCalls, []);
  });

  it("calls no pixel for any other event either", () => {
    trackViewItem({ id: 7, sku: "MUG-RED", name: "Red mug", effective_price: 600, variants: [] } as never);
    trackAddToCart({ id: 7, sku: "MUG", slug: "mug", name: "Mug", effective_price: 600, stock_quantity: 5 }, 1);
    trackBeginCheckout([cartLine], 1200);
    trackPageView("", false);

    assert.deepEqual(layer().map((entry) => entry.event), ["view_item", "add_to_cart", "begin_checkout", "page_view"]);
    assert.deepEqual(fbqCalls, []);
    assert.deepEqual(ttqCalls, []);
  });

  it("does not hand Meta advanced matching from the site (the container's purchase tag does it from the hashed data layer values)", async () => {
    (win.window as Record<string, unknown>).anaizaConsent = { config: { meta: "111222333", gtm: "GTM-TESTCONT" }, effective: () => ({ a: true, m: true }) };

    await trackPurchase(order("cod"));

    assert.equal(fbqCalls.filter((call) => call[0] === "init").length, 0);
  });

  it("gives the purchase the id the server uses and the hashed buyer details, and nothing raw", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { event_id: string; ecommerce: { transaction_id: string; value: number; currency: string; shipping: number }; user_data: Record<string, string> };
    assert.equal(purchase.event_id, "order-42");
    assert.deepEqual([purchase.ecommerce.transaction_id, purchase.ecommerce.value, purchase.ecommerce.currency, purchase.ecommerce.shipping], ["42", 600, "BDT", 80]);
    assert.deepEqual(Object.keys(purchase.user_data).sort(), ["external_id", "sha256_email_address", "sha256_phone_number"]);
    assert.equal("meta_user_data" in purchase, false, "one set of hashed details, not two");

    const pushed = JSON.stringify(layer());
    for (const raw of ["Nusrat", "Jahan", "nusrat.jahan@gmail.com", "Nusrat.Jahan", "01712345678", "+8801712345678"]) {
      assert.ok(!pushed.includes(raw), `${raw} is never in the data layer`);
    }
  });

  it("keeps a wallet order out of revenue: only the pending event", async () => {
    await trackPurchase(order("bkash"));

    assert.deepEqual(layer().map((entry) => entry.event), ["order_pending_payment"]);
    assert.deepEqual(fbqCalls, []);
  });

  it("pushes no buyer details when the visitor has not allowed marketing", async () => {
    (win.window as Record<string, unknown>).anaizaConsent = { config: { meta: null, gtm: "GTM-TESTCONT" }, effective: () => ({ a: true, m: false }) };

    await trackPurchase(order("cod"));

    const purchase = layer()[0] as Record<string, unknown>;
    assert.equal("user_data" in purchase, false);
    assert.equal(purchase.event_id, "order-42", "the event id is not personal data");
  });
});

describe("direct mode: the site calls the pixels, with the same id the data layer and the server use", () => {
  it("sends Meta's eventID and TikTok's event_id as the same order-<id> as the data layer's event_id", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { event_id: string };
    assert.equal(purchase.event_id, "order-42");
    assert.deepEqual(fbqCalls.find((call) => call[1] === "Purchase")?.[3], { eventID: purchase.event_id });
    assert.deepEqual(ttqCalls.find((call) => call[0] === "CompletePayment")?.[2], { event_id: purchase.event_id });
  });
});

describe("the cart and search events", () => {
  beforeEach(() => setUpPage());

  it("view_cart lists the lines by SKU with the cart's value, and says nothing for an empty cart", () => {
    trackViewCart([], 0);
    assert.deepEqual(layer(), []);

    trackViewCart([cartLine], 1200);
    assert.deepEqual(
      layer().map((entry) => ({ ...entry, event_id: "x" })),
      [{ event: "view_cart", event_id: "x", ecommerce: { currency: "BDT", value: 1200, items: [{ item_id: "MUG-RED", item_name: "Mug", price: 600, quantity: 2, item_category: "Mugs" }] } }],
    );
  });

  it("search carries the trimmed term, and nothing is sent for an empty one", () => {
    trackSearch("   ");
    assert.deepEqual(layer(), []);

    trackSearch("  tea set ");
    assert.deepEqual(layer().map((entry) => ({ ...entry, event_id: "x" })), [{ event: "search", event_id: "x", search_term: "tea set" }]);
  });
});
