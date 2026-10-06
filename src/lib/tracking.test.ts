// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { trackPurchase } from "./tracking.ts";
import type { Order } from "./types.ts";

type Call = unknown[];

const fbqCalls: Call[] = [];
const ttqCalls: Call[] = [];
const win = globalThis as unknown as {
  window?: Record<string, unknown>;
};

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
    customer: { id: 1, name: "A", email: null, phone: "01700000000", address: "x", division: "Dhaka", district: "Dhaka", thana: "Banani" },
    items: [{ id: 1, product_id: 7, product_name: "Mug", quantity: 1, price: 600, variant_name: null, variant_value: null, sku: "M-1" }],
  } as unknown as Order;
}

const layer = () => (win.window?.dataLayer as Record<string, unknown>[]).filter((entry) => entry.event);

beforeEach(() => {
  fbqCalls.length = 0;
  ttqCalls.length = 0;
  win.window = {
    dataLayer: [],
    fbq: (...args: unknown[]) => fbqCalls.push(args),
    ttq: { track: (...args: unknown[]) => ttqCalls.push(args), page: () => undefined },
  };
});

describe("trackPurchase", () => {
  it("counts a cash on delivery order as a sale in GA4, Meta and TikTok at placement", () => {
    trackPurchase(order("cod"));

    assert.deepEqual(layer().map((entry) => entry.event), ["purchase"]);
    assert.equal(fbqCalls.length, 1);
    assert.equal(fbqCalls[0][1], "Purchase");
    assert.deepEqual(fbqCalls[0][3], { eventID: "order-42" });
    assert.equal(ttqCalls.length, 1);
    assert.equal(ttqCalls[0][0], "CompletePayment");
  });

  it("counts no wallet order as a sale: bKash, Nagad and Rocket send only a non-revenue pending event", () => {
    for (const method of ["bkash", "nagad", "rocket"]) {
      fbqCalls.length = 0;
      ttqCalls.length = 0;
      (win.window!.dataLayer as unknown[]).length = 0;

      trackPurchase(order(method));

      assert.deepEqual(layer(), [{ event: "order_pending_payment", order_id: "42", payment_type: method }], method);
      assert.equal(fbqCalls.length, 0, `${method}: no Meta Purchase`);
      assert.equal(ttqCalls.length, 0, `${method}: no TikTok CompletePayment`);
    }
  });

  it("puts no revenue, no items and no purchase event anywhere in a wallet order's data layer", () => {
    trackPurchase(order("bkash"));

    const everything = JSON.stringify(win.window!.dataLayer);
    assert.ok(!everything.includes('"purchase"'));
    assert.ok(!everything.includes("value"));
    assert.ok(!everything.includes("items"));
    assert.ok(!everything.includes("680"));
  });
});
