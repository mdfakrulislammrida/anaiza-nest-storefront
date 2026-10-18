import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clickIdsFromRecord, utmFromRecord } from "./attribution.ts";
import { cleanCouponCode } from "./coupon.ts";
import {
  CART_KEY,
  AUTH_KEY,
  LAST_ORDER_KEY,
  WISHLIST_KEY,
  isSessionToken,
  loadAuth,
  loadCart,
  loadLastOrder,
  loadWishlist,
  parseNumberList,
  parseRecoveredContact,
  parseStringList,
  parseViewedIds,
  readAuthToken,
  type StorageLike,
} from "./storedState.ts";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

// Storage that refuses everything, as a blocked or full one does.
const brokenStorage: StorageLike = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
  removeItem() {
    throw new Error("blocked");
  },
};

function storageWith(key: string, raw: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(key, raw);
  return storage;
}

const line = {
  key: "4:base",
  productId: 4,
  slug: "anniversary-gift-hamper",
  name: "Anniversary Gift Hamper",
  price: 2800,
  image: "https://example.test/a.jpg",
  variantId: null,
  variantLabel: null,
  sku: "ANZ-GB-001",
  quantity: 2,
  stock: 5,
};

describe("the saved cart", () => {
  it("comes back as it was saved", () => {
    const storage = storageWith(CART_KEY, JSON.stringify([line, { ...line, key: "5:9", productId: 5, variantId: 9, variantLabel: "Colour: Blue", sku: undefined }]));
    const cart = loadCart(storage);

    assert.equal(cart.length, 2);
    assert.deepEqual(cart[0], line);
    assert.equal("sku" in cart[1], false, "a line saved before SKUs were kept has none");
    assert.ok(storage.getItem(CART_KEY) !== null, "a good cart is left in place");
  });

  it("ignores the old site's cart, {state:{lines}}, and removes it", () => {
    const old = JSON.stringify({ state: { lines: [{ id: 12, sku: "OLD-1", qty: 1, price: 900 }] }, version: 0 });
    const storage = storageWith(CART_KEY, old);

    assert.deepEqual(loadCart(storage), []);
    assert.equal(storage.getItem(CART_KEY), null);
  });

  it("ignores a string, a number, null, true and an empty object, and removes each", () => {
    for (const raw of ['"just text"', "42", "null", "true", "{}", '"[]"']) {
      const storage = storageWith(CART_KEY, raw);
      assert.deepEqual(loadCart(storage), [], raw);
      assert.equal(storage.getItem(CART_KEY), null, `${raw} is removed`);
    }
  });

  it("ignores broken JSON and removes it", () => {
    for (const raw of ["{not json", "[{\"key\":", "", "undefined"]) {
      const storage = storageWith(CART_KEY, raw);
      assert.deepEqual(loadCart(storage), [], JSON.stringify(raw));
      assert.equal(storage.getItem(CART_KEY), null);
    }
  });

  it("is empty when nothing is saved, and when storage cannot be read", () => {
    assert.deepEqual(loadCart(new MemoryStorage()), []);
    assert.deepEqual(loadCart(brokenStorage), []);
  });

  it("keeps the good lines of a half-valid list and drops the rest", () => {
    const half = [
      line,
      { ...line, key: "6:base", productId: 6, quantity: 0 }, // not positive
      { ...line, key: "7:base", productId: 7, quantity: 1.5 }, // not whole
      { ...line, key: "8:base", productId: 8, quantity: "2" }, // not a number
      { ...line, key: "9:base", productId: 9, price: "2800" }, // price as text
      { ...line, key: "10:base", productId: 10, price: -5 }, // negative
      { ...line, key: "11:base", productId: "11" }, // id as text
      { ...line, key: "", productId: 12 }, // no key
      { ...line, key: "13:base", productId: 13, name: undefined }, // no name
      { ...line, key: "14:base", productId: 14, sku: 5 }, // sku of the wrong kind
      null,
      "text",
      7,
      [],
      { id: 15, sku: "OLD", quantity: 1, price: 10 }, // the old site's line
      { ...line, key: "20:base", productId: 20, price: 0 }, // a free line is still a line
    ];
    const storage = storageWith(CART_KEY, JSON.stringify(half));
    const cart = loadCart(storage);

    assert.deepEqual(cart.map((item) => item.key), ["4:base", "20:base"]);
  });

  it("keeps one line per key and copies only the known fields", () => {
    const twice = [line, { ...line, quantity: 9 }, { ...line, key: "x", productId: 99, __proto__: { polluted: true }, extra: "ignored" }];
    const cart = loadCart(storageWith(CART_KEY, JSON.stringify(twice)));

    assert.deepEqual(cart.map((item) => item.key), ["4:base", "x"]);
    assert.equal(cart[0].quantity, 2, "the first line wins");
    assert.equal("extra" in cart[1], false);
  });

  it("gives a list every part of the page can add up (the failure that blanked the page)", () => {
    for (const raw of [JSON.stringify({ state: { lines: [] }, version: 0 }), '"x"', "9", "null", JSON.stringify([line, 3])]) {
      const cart = loadCart(storageWith(CART_KEY, raw));
      assert.ok(Array.isArray(cart));
      assert.doesNotThrow(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
    }
  });
});

describe("the saved wishlist", () => {
  const item = { productId: 4, slug: "hamper", name: "Hamper", image: null, price: 2800, sku: "ANZ-1" };

  it("comes back as saved, and ignores every other shape", () => {
    assert.deepEqual(loadWishlist(storageWith(WISHLIST_KEY, JSON.stringify([item]))), [item]);

    for (const raw of [JSON.stringify({ state: { items: [item] }, version: 0 }), '"text"', "5", "null", "{oops"]) {
      const storage = storageWith(WISHLIST_KEY, raw);
      assert.deepEqual(loadWishlist(storage), [], raw);
      assert.equal(storage.getItem(WISHLIST_KEY), null);
    }
  });

  it("keeps the good items of a half-valid list, once each", () => {
    const list = [item, item, { ...item, productId: 5, price: "10" }, { ...item, productId: 6, name: "" }, null, { ...item, productId: 7, image: "https://example.test/x.jpg" }];
    assert.deepEqual(loadWishlist(storageWith(WISHLIST_KEY, JSON.stringify(list))).map((entry) => entry.productId), [4, 7]);
  });
});

describe("the saved sign-in", () => {
  const record = { customer: { id: 3, name: "Rima", email: "rima@example.test", phone: "01711000000" }, token: "abc123" };

  it("is used when it is a customer with a token", () => {
    assert.deepEqual(loadAuth(storageWith(AUTH_KEY, JSON.stringify(record))), record);
    assert.equal(readAuthToken(storageWith(AUTH_KEY, JSON.stringify(record))), "abc123");
  });

  it("is ignored and removed when it is anything else", () => {
    for (const raw of [JSON.stringify({ state: { user: {} } }), JSON.stringify({ customer: "Rima", token: "t" }), JSON.stringify({ customer: record.customer }), JSON.stringify({ customer: record.customer, token: { x: 1 } }), '"x"', "null", "8", "{bad"]) {
      const storage = storageWith(AUTH_KEY, raw);
      assert.equal(loadAuth(storage), null, raw);
      assert.equal(storage.getItem(AUTH_KEY), null, `${raw} is removed`);
    }
  });

  it("gives a token only when it is text", () => {
    assert.equal(readAuthToken(storageWith(AUTH_KEY, JSON.stringify({ token: { evil: true } }))), null);
    assert.equal(readAuthToken(storageWith(AUTH_KEY, "not json")), null);
    assert.equal(readAuthToken(new MemoryStorage()), null);
    assert.equal(readAuthToken(brokenStorage), null);
  });
});

describe("the last order", () => {
  const order = { id: 11, status: "pending", payment_method: "cod", subtotal: 2800, delivery_fee: 0, total: 2800, gift_note: null, created_at: "2026-10-18", customer: { name: "Rima" }, items: [{ name: "Hamper" }] };

  it("is used when it looks like an order, and removed when it does not", () => {
    assert.equal(loadLastOrder(storageWith(LAST_ORDER_KEY, JSON.stringify(order)))?.id, 11);

    for (const raw of ['"x"', "3", "null", "{bad", JSON.stringify({ ...order, items: "none" }), JSON.stringify({ ...order, id: "11" }), JSON.stringify({ ...order, total: "2800" }), JSON.stringify({ state: {} })]) {
      const storage = storageWith(LAST_ORDER_KEY, raw);
      assert.equal(loadLastOrder(storage), null, raw);
      assert.equal(storage.getItem(LAST_ORDER_KEY), null);
    }
  });
});

describe("the small lists and records", () => {
  it("keeps the last five viewed products, whole numbers only", () => {
    assert.deepEqual(parseViewedIds("[1,2,3,4,5,6,7]"), [3, 4, 5, 6, 7]);
    assert.deepEqual(parseViewedIds('[1,"2",3.5,null,-4,0,6]'), [1, 6]);

    for (const raw of [null, "", "{bad", '"text"', "12", "null", '{"state":[1,2]}']) {
      assert.deepEqual(parseViewedIds(raw), []);
    }
  });

  it("reads lists of strings and of order numbers, and nothing else", () => {
    assert.deepEqual(parseStringList('["cart",3,"checkout_started",null]'), ["cart", "checkout_started"]);
    assert.deepEqual(parseStringList('{"a":1}'), []);
    assert.deepEqual(parseNumberList("[1,2,\"3\",null,4]"), [1, 2, 4]);
    assert.deepEqual(parseNumberList("garbage"), []);
  });

  it("accepts only a checkout token of the kind this shop makes", () => {
    assert.equal(isSessionToken("a".repeat(48)), true);
    for (const value of ["", "abc", "A".repeat(48), "g".repeat(48), "a".repeat(49), 12, null, undefined, { token: "a".repeat(48) }, '{"state":{}}']) {
      assert.equal(isSessionToken(value), false);
    }
  });

  it("takes text fields only from a reminder's contact details", () => {
    assert.deepEqual(parseRecoveredContact('{"name":"Rima","email":"r@example.test","phone":"017","extra":"x"}'), { name: "Rima", email: "r@example.test", phone: "017" });
    assert.deepEqual(parseRecoveredContact('{"name":{"a":1},"email":5,"phone":""}'), {});

    for (const raw of [null, "", "{bad", "null", '"text"', "[1]"]) {
      assert.deepEqual(parseRecoveredContact(raw), {});
    }
  });

  it("accepts a coupon code only when it is a plain code", () => {
    assert.equal(cleanCouponCode(" EID25 "), "EID25");
    assert.equal(cleanCouponCode("save-10_a"), "save-10_a");

    for (const value of ["", "   ", "<script>", "two words", "x".repeat(65), '{"state":{}}', 5, null, undefined]) {
      assert.equal(cleanCouponCode(value), null);
    }
  });
});

describe("campaign records", () => {
  const now = Date.UTC(2026, 9, 18);
  const day = 24 * 60 * 60 * 1000;

  it("use only fresh records with short text values", () => {
    assert.deepEqual(utmFromRecord({ utm_source: "meta", utm_campaign: "eid", capturedAt: now - day }, now), { utm_source: "meta", utm_campaign: "eid" });
    assert.deepEqual(clickIdsFromRecord({ fbclid: "abc123", gclid: "x y", capturedAt: now - day }, now), { fbclid: "abc123" });
  });

  it("ignore everything else", () => {
    for (const record of [null, "text", 5, [], {}, { utm_source: "meta" }, { utm_source: "meta", capturedAt: "yesterday" }, { utm_source: "meta", capturedAt: now - 400 * day }, { utm_source: "meta", capturedAt: now + 10 * day }, { utm_source: "meta", capturedAt: Number.NaN }, { state: { utm_source: "meta" } }]) {
      assert.deepEqual(utmFromRecord(record, now), {});
      assert.deepEqual(clickIdsFromRecord(record, now), {});
    }
  });

  it("drop values that are not short text", () => {
    assert.deepEqual(utmFromRecord({ utm_source: { a: 1 }, utm_medium: 7, utm_campaign: "x".repeat(300), utm_term: "  ", capturedAt: now }, now), {});
  });
});
