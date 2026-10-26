// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { feedItemId, trackAddToCart, trackBeginCheckout, trackPageView, trackPurchase, trackSearch, trackViewCart, trackViewItem } from "./tracking.ts";
import type { Order } from "./types.ts";

type Call = unknown[];

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const fbqCalls: Call[] = [];
const ttqCalls: Call[] = [];
const win = globalThis as unknown as { window?: Record<string, unknown> };

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
    items: [{ id: 1, product_id: 7, product_name: "Mug", quantity: 1, price: 600, variant_name: null, variant_value: null, sku: "M-1" }],
  } as unknown as Order;
}

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

  it("adds hashed user data to the purchase event for Google Enhanced Conversions", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { user_data?: unknown };
    assert.deepEqual(purchase.user_data, {
      sha256_email_address: sha("nusratjahan@gmail.com"),
      sha256_phone_number: sha("+8801712345678"),
      address: { sha256_first_name: sha("nusrat"), sha256_last_name: sha("jahan"), city: "dhaka", region: "dhaka", country: "BD" },
    });
  });

  it("never pushes a raw email, phone number or name", async () => {
    await trackPurchase(order("cod"));

    const everything = JSON.stringify(win.window?.dataLayer) + JSON.stringify(fbqCalls) + JSON.stringify(ttqCalls);
    for (const raw of ["Nusrat", "nusrat", "Jahan", "gmail", "01712345678", "8801712345678", "House 1", "Banani"]) {
      assert.ok(!everything.includes(raw), `${raw} must not appear`);
    }
  });

  it("gives Meta the same details as hashed advanced matching, just before the Purchase", async () => {
    await trackPurchase(order("cod"));

    const init = fbqCalls.findIndex((call) => call[0] === "init");
    const purchase = fbqCalls.findIndex((call) => call[1] === "Purchase");
    assert.ok(init >= 0 && init < purchase, "init with user data comes before Purchase");
    assert.deepEqual(fbqCalls[init], [
      "init",
      "111222333",
      {
        em: sha("nusrat.jahan@gmail.com"),
        ph: sha("8801712345678"),
        fn: sha("nusrat"),
        ln: sha("jahan"),
        ct: sha("dhaka"),
        st: sha("dhaka"),
        country: sha("bd"),
      },
    ]);
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

      assert.deepEqual(layer(), [{ event: "order_pending_payment", order_id: "42", payment_type: method }], method);
      assert.equal(fbqCalls.length, 0, `${method}: nothing to Meta`);
      assert.equal(ttqCalls.length, 0, `${method}: nothing to TikTok`);
    }
  });

  it("puts no revenue, no items, no buyer data and no purchase event in a wallet order's data layer", async () => {
    await trackPurchase(order("bkash"));

    const everything = JSON.stringify(win.window?.dataLayer);
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

// ---- One owner for the browser tags (see consentBootstrap.ts). With a GTM container the site only fills the data layer; without one it
// ---- keeps calling the pixels itself. Either way the data layer carries the same events.

/** A page built with a GTM container: the pixels, if the container's tags have defined them, must never be called by the site. */
function setUpGtmPage() {
  setUpPage();
  (win.window as Record<string, unknown>).anaizaConsent = { config: { meta: null, gtm: "GTM-TESTCONT" }, effective: () => ({ a: true, m: true }) };
  (win.window as Record<string, unknown>).location = { href: "https://anaizanest.com/shop", pathname: "/shop" };
}

const cartLine = { key: "7:base", productId: 7, slug: "mug", name: "Mug", price: 600, image: null, variantId: null, variantLabel: null, sku: "MUG-RED", quantity: 2, stock: 5 };

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
    trackPageView();

    assert.deepEqual(layer().map((entry) => entry.event), ["view_item", "add_to_cart", "begin_checkout", "page_view"]);
    assert.deepEqual(fbqCalls, []);
    assert.deepEqual(ttqCalls, []);
  });

  it("pushes a page_view on a route change, for the container's Meta and TikTok page-view tags", () => {
    trackPageView();

    assert.deepEqual(layer(), [{ event: "page_view", page_location: "https://anaizanest.com/shop", page_path: "/shop", page_title: "" }]);
  });

  it("does not hand Meta advanced matching from the site (the container's purchase tag does it from the hashed data layer values)", async () => {
    (win.window as Record<string, unknown>).anaizaConsent = { config: { meta: "111222333", gtm: "GTM-TESTCONT" }, effective: () => ({ a: true, m: true }) };

    await trackPurchase(order("cod"));

    assert.equal(fbqCalls.filter((call) => call[0] === "init").length, 0);
  });

  it("gives the purchase the id the server sends, the order id, and the hashed buyer details for both platforms", async () => {
    await trackPurchase(order("cod"));

    const purchase = layer()[0] as { event_id: string; ecommerce: { transaction_id: string; value: number; currency: string; shipping: number }; user_data: unknown; meta_user_data: Record<string, string> };
    assert.equal(purchase.event_id, "order-42");
    assert.deepEqual([purchase.ecommerce.transaction_id, purchase.ecommerce.value, purchase.ecommerce.currency, purchase.ecommerce.shipping], ["42", 680, "BDT", 80]);
    assert.deepEqual(purchase.meta_user_data, {
      em: sha("nusrat.jahan@gmail.com"),
      ph: sha("8801712345678"),
      fn: sha("nusrat"),
      ln: sha("jahan"),
      ct: sha("dhaka"),
      st: sha("dhaka"),
      country: sha("bd"),
    });
    assert.ok(purchase.user_data);

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
    assert.equal("meta_user_data" in purchase, false);
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

  it("a route change calls fbq PageView and ttq.page, and pushes nothing to the data layer", () => {
    let ttqPages = 0;
    (win.window as { ttq: { page: () => void } }).ttq.page = () => ttqPages++;

    trackPageView();

    assert.equal(fbqCalls.filter((call) => call[1] === "PageView").length, 1);
    assert.equal(ttqPages, 1);
    assert.deepEqual(layer(), []);
  });
});

describe("the cart and search events", () => {
  beforeEach(() => setUpPage());

  it("view_cart lists the lines by SKU with the cart's value, and says nothing for an empty cart", () => {
    trackViewCart([], 0);
    assert.deepEqual(layer(), []);

    trackViewCart([cartLine], 1200);
    assert.deepEqual(layer(), [
      { event: "view_cart", ecommerce: { currency: "BDT", value: 1200, items: [{ item_id: "MUG-RED", item_name: "Mug", price: 600, quantity: 2 }] } },
    ]);
  });

  it("search carries the trimmed term, and nothing is sent for an empty one", () => {
    trackSearch("   ");
    assert.deepEqual(layer(), []);

    trackSearch("  tea set ");
    assert.deepEqual(layer(), [{ event: "search", search_term: "tea set" }]);
  });
});
