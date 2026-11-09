// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeFilterChips, activeFilterCount, priceLabel } from "./listFilters.ts";
import { PRICE_RANGES } from "./priceRanges.ts";

describe("the price filter's label", () => {
  it("uses the shop's own wording for each of its four ranges", () => {
    for (const range of PRICE_RANGES) assert.equal(priceLabel(range.min, range.max), range.label);
  });

  it("makes one from the numbers for a range the shop does not list", () => {
    assert.equal(priceLabel(2000, 5000), "৳2,000 – ৳5,000");
    assert.equal(priceLabel(undefined, 800), "Under ৳800");
    assert.equal(priceLabel(12000, undefined), "Above ৳12,000");
  });

  it("is null when there is no price filter, or the address holds something that is not a number", () => {
    assert.equal(priceLabel(), null);
    assert.equal(priceLabel(Number.NaN, Number.NaN), null);
  });
});

describe("the chips under the Filter and Sort bar", () => {
  it("are none and a count of 0 when nothing is filtered", () => {
    assert.deepEqual(activeFilterChips({}), []);
    assert.equal(activeFilterCount({}), 0);
  });

  it("are one for each filter that is on, price first, and the count follows them", () => {
    const state = { minPrice: 1500, maxPrice: 3000, tag: "eid-gift", tagName: "Eid gift", search: "tea" };
    const chips = activeFilterChips(state);

    assert.deepEqual(chips.map((chip) => [chip.key, chip.label]), [
      ["price", "৳1,500 – ৳3,000"],
      ["tag", "Tag: Eid gift"],
      ["search", "Search: tea"],
    ]);
    assert.equal(activeFilterCount(state), 3);
  });

  it("read a tag without a name as words", () => {
    assert.equal(activeFilterChips({ tag: "eid-gift" })[0].label, "Tag: eid gift");
  });

  it("take away only their own filter: the change to the address clears that parameter and no other", () => {
    const [price, tag, search] = activeFilterChips({ minPrice: 1, maxPrice: 2, tag: "x", search: "y" });

    assert.deepEqual(price.remove, { min_price: undefined, max_price: undefined });
    assert.deepEqual(tag.remove, { tag: undefined });
    assert.deepEqual(search.remove, { search: undefined });
  });
});
