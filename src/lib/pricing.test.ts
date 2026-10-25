import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pricedView, priceView, saleApplies, withCheckedPrices } from "./pricing.ts";
import { cardTag, countOf, isLowStock, isSoldOut } from "./cardTag.ts";

describe("what counts as a sale", () => {
  it("is a sale price above 0 and below the regular price", () => {
    assert.equal(saleApplies(1450, 1200), true);
    assert.equal(saleApplies(1450, 1), true);
  });

  it("is no sale for 0, a negative price, an equal or higher price, or none at all", () => {
    for (const sale of [0, -1, -400, 1450, 1500, null, undefined, Number.NaN]) {
      assert.equal(saleApplies(1450, sale), false, String(sale));
    }
  });

  it("never shows ৳0 or a saving of the whole price", () => {
    assert.deepEqual(priceView(2930, 0), { current: 2930, old: null, onSale: false, saving: 0 });
    assert.deepEqual(priceView(2930, 2600), { current: 2600, old: 2930, onSale: true, saving: 330 });
  });
});

describe("a variant's price", () => {
  const product = { price: 1000, sale_price: 800 };

  it("takes the product's price and sale when the variant has no price of its own", () => {
    assert.equal(pricedView(product, { price: null, sale_price: null }).current, 800);
    assert.equal(pricedView(product, null).current, 800);
  });

  it("uses its own price and its own sale otherwise, with the same rule", () => {
    assert.deepEqual(pricedView(product, { price: 900, sale_price: 700 }), { current: 700, old: 900, onSale: true, saving: 200 });
    assert.deepEqual(pricedView(product, { price: 900, sale_price: 0 }), { current: 900, old: null, onSale: false, saving: 0 });
  });
});

describe("the tag on a product card", () => {
  const base = { stock_quantity: 10, is_new: false, labels: [] as { name: string }[] };

  it("is one tag, in order: sold out, special price, the label, new, none", () => {
    assert.deepEqual(cardTag({ ...base, stock_quantity: 0, is_new: true, labels: [{ name: "Travel set" }] }, true), { kind: "sold-out", text: "Sold out" });
    assert.deepEqual(cardTag({ ...base, is_new: true, labels: [{ name: "Travel set" }] }, true), { kind: "sale", text: "Special price" });
    assert.deepEqual(cardTag({ ...base, is_new: true, labels: [{ name: "Travel set" }] }, false), { kind: "label", text: "Travel set" });
    assert.deepEqual(cardTag({ ...base, is_new: true }, false), { kind: "new", text: "New" });
    assert.equal(cardTag(base, false), null);
  });

  it("shows only the first label, trimmed, and skips an empty one", () => {
    assert.equal(cardTag({ ...base, labels: [{ name: " \t" }, { name: "Handcrafted\t" }, { name: "Travel set" }] }, false)?.text, "Handcrafted");
  });

  it("knows a low-stock and a sold-out piece", () => {
    assert.equal(isLowStock(3), true);
    assert.equal(isLowStock(4), false);
    assert.equal(isLowStock(0), false);
    assert.equal(isSoldOut(0), true);
    assert.equal(isSoldOut(1), false);
  });
});

describe("counts in words", () => {
  it("says 1 product and 2 products", () => {
    assert.equal(countOf(0, "product"), "0 products");
    assert.equal(countOf(1, "product"), "1 product");
    assert.equal(countOf(2, "product"), "2 products");
  });
});

describe("a product as it comes from the API", () => {
  const variant = (over: Record<string, unknown> = {}) => ({ price: null, sale_price: null, effective_price: 0, discount_percent: 100, ...over });
  const product = (over: Record<string, unknown> = {}) => ({ price: 2930, sale_price: 0, effective_price: 0, discount_percent: 100, variants: [variant()], ...over });

  it("shows the regular price and no discount when the sale price is 0, whatever the API worked out", () => {
    const fixed = withCheckedPrices(product());
    assert.equal(fixed.effective_price, 2930);
    assert.equal(fixed.discount_percent, null);
    assert.equal(fixed.sale_price, null);
    assert.equal(fixed.variants[0].effective_price, 2930);
    assert.equal(fixed.variants[0].discount_percent, null);
  });

  it("keeps a real sale, with the percentage worked out from the two prices", () => {
    const fixed = withCheckedPrices(product({ sale_price: 2600, effective_price: 2600, discount_percent: 11 }));
    assert.equal(fixed.effective_price, 2600);
    assert.equal(fixed.discount_percent, 11);
    assert.equal(fixed.variants[0].effective_price, 2600);
  });

  it("treats a variant's own price and sale with the same rule", () => {
    const fixed = withCheckedPrices(product({ variants: [variant({ price: 900, sale_price: 0 }), variant({ price: 900, sale_price: 450 })] }));
    assert.equal(fixed.variants[0].effective_price, 900);
    assert.equal(fixed.variants[0].discount_percent, null);
    assert.equal(fixed.variants[1].effective_price, 450);
    assert.equal(fixed.variants[1].discount_percent, 50);
  });

  it("leaves a product without variants alone", () => {
    const fixed = withCheckedPrices({ price: 1000, sale_price: null, effective_price: 1000, discount_percent: null });
    assert.equal("variants" in fixed, false);
  });
});
