import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { restorePlan, type RecoveredCart, type RecoveredLine } from "./cartRecovery.ts";
import { buildReport, isIdentified, mayStoreIdentified, pushViewed, validEmail, validPhone } from "./recovery.ts";

const item = { productId: 7, variantId: null, sku: "TS-1", name: "Tea set", variantLabel: null, price: 1450, quantity: 1, image: null, slug: "tea-set" };

function report(overrides: Partial<Parameters<typeof buildReport>[0]> = {}) {
  return buildReport({
    stage: "cart",
    contact: {},
    items: [item],
    viewed: [1, 2],
    token: "tok-123",
    optIn: false,
    marketingAllowed: true,
    countOnceOnly: true,
    ...overrides,
  });
}

describe("who can be contacted", () => {
  it("accepts only a complete email or Bangladeshi mobile number", () => {
    assert.equal(validEmail(" Priya@Example.com "), "priya@example.com");
    assert.equal(validEmail("priya@"), null);
    assert.equal(validEmail("priya@example"), null);
    assert.equal(validPhone("+880 1711-111111"), "01711111111");
    assert.equal(validPhone("0171111"), null);
    assert.equal(validPhone("01211111111"), null);
  });

  it("is identified by either one, never by a name alone", () => {
    assert.equal(isIdentified({ name: "Priya" }), false);
    assert.equal(isIdentified({ email: "half@" }), false);
    assert.equal(isIdentified({ phone: "01711111111" }), true);
    assert.equal(isIdentified({ email: "priya@example.com" }), true);
  });
});

describe("what is reported", () => {
  it("describes an anonymous visitor to nobody: a count, once, with nothing about them", () => {
    const payload = report({ contact: { name: "Priya" } });

    assert.deepEqual(payload, { stage: "cart", count_only: true });
  });

  it("says nothing about an anonymous visitor a second time for the same stage", () => {
    assert.equal(report({ countOnceOnly: false }), null);
  });

  it("never sends a half-typed email or number", () => {
    const payload = report({ contact: { email: "pri", phone: "017" }, countOnceOnly: false });

    assert.equal(payload, null);
  });

  it("notice mode stores an identified cart, with the cart and the last products viewed", () => {
    const payload = report({ contact: { name: "Priya", email: "priya@example.com" }, optIn: false, marketingAllowed: false });

    assert.equal(payload?.session_token, "tok-123");
    assert.equal(payload?.stage, "contact_filled");
    assert.equal(payload?.email, "priya@example.com");
    assert.equal(payload?.items?.[0].sku, "TS-1");
    assert.deepEqual(payload?.viewed_products, [1, 2]);
    assert.equal(payload?.whatsapp_optin, false);
  });

  it("opt-in mode sends nothing identifying until marketing is allowed", () => {
    const refused = report({ contact: { email: "priya@example.com" }, optIn: true, marketingAllowed: false });
    const allowed = report({ contact: { email: "priya@example.com" }, optIn: true, marketingAllowed: true });

    assert.equal(refused, null);
    assert.equal(allowed?.marketing_consent, true);
  });

  it("carries the WhatsApp box only when it was ticked", () => {
    assert.equal(report({ contact: { phone: "01711111111", whatsappOptIn: true } })?.whatsapp_optin, true);
    assert.equal(report({ contact: { phone: "01711111111" } })?.whatsapp_optin, false);
  });

  it("applies the cookie rule in one place", () => {
    assert.equal(mayStoreIdentified(false, false), true);
    assert.equal(mayStoreIdentified(true, false), false);
    assert.equal(mayStoreIdentified(true, true), true);
  });
});

describe("last products viewed", () => {
  it("keeps five, newest last, without repeats", () => {
    let list: number[] = [];
    for (const id of [1, 2, 3, 4, 5, 6, 3]) list = pushViewed(list, id);

    assert.deepEqual(list, [2, 4, 5, 6, 3]);
  });
});

function line(overrides: Partial<RecoveredLine> = {}): RecoveredLine {
  return {
    product_id: 7, variant_id: null, slug: "tea-set", name: "Tea set", variant: null, sku: "TS-1", quantity: 1, wanted: 1, available: 5,
    price: 1450, was_price: 1450, image: null, status: "ok", ...overrides,
  };
}

function cart(items: RecoveredLine[]): RecoveredCart {
  return { found: true, name: "Priya", email: "priya@example.com", phone: "01711111111", items, coupon: null, coupon_ended: false };
}

describe("restoring a saved cart", () => {
  it("puts back what is as it was, with no note", () => {
    const plan = restorePlan(cart([line()]));

    assert.equal(plan.lines.length, 1);
    assert.deepEqual(plan.notes, []);
  });

  it("leaves out what is out of stock or gone, and says so calmly", () => {
    const plan = restorePlan(cart([line({ status: "out_of_stock", quantity: 0, available: 0 }), line({ product_id: 8, name: "Glass jug", status: "unavailable" })]));

    assert.equal(plan.lines.length, 0);
    assert.equal(plan.notes.length, 2);
    assert.ok(plan.notes[0].includes("out of stock just now"));
    assert.ok(plan.notes[1].includes("no longer in the shop"));
  });

  it("lowers a quantity to what is left and says so", () => {
    const plan = restorePlan(cart([line({ status: "reduced", wanted: 3, quantity: 2, available: 2 })]));

    assert.equal(plan.lines[0].quantity, 2);
    assert.deepEqual(plan.notes, ["Only 2 of Tea set are left, so we have put 2 in your cart."]);
  });

  it("uses the price as it is now and names the change", () => {
    const plan = restorePlan(cart([line({ status: "price_changed", price: 1600, was_price: 1450 })]));

    assert.equal(plan.lines[0].price, 1600);
    assert.deepEqual(plan.notes, ["The price of Tea set is now ৳1,600, it was ৳1,450."]);
  });

  it("names a variant", () => {
    const plan = restorePlan(cart([line({ variant: "Colour: Red", status: "out_of_stock", quantity: 0 })]));

    assert.ok(plan.notes[0].startsWith("Tea set (Colour: Red)"));
  });
});
