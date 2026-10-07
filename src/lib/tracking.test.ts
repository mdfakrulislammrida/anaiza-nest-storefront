// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { trackPurchase } from "./tracking.ts";
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
