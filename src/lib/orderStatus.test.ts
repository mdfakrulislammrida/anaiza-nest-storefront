import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { knownOrderStatuses, orderStatusLabel, UNKNOWN_STATUS_LABEL } from "./orderStatus.ts";

describe("order status labels", () => {
  it("names the six statuses the shop can send in plain words", () => {
    assert.equal(orderStatusLabel("pending"), "Order received");
    assert.equal(orderStatusLabel("processing"), "Being prepared");
    assert.equal(orderStatusLabel("shipped"), "On its way");
    assert.equal(orderStatusLabel("delivered"), "Delivered");
    assert.equal(orderStatusLabel("cancelled"), "Cancelled");
    assert.equal(orderStatusLabel("returned"), "Returned");
  });

  it("reads spelling and case variants as the same status", () => {
    assert.equal(orderStatusLabel("Shipped"), "On its way");
    assert.equal(orderStatusLabel(" DELIVERED "), "Delivered");
    assert.equal(orderStatusLabel("on-hold"), "On hold");
    assert.equal(orderStatusLabel("On Hold"), "On hold");
  });

  it("never shows a code: an unknown, empty or missing status gets the general label", () => {
    for (const status of ["in_transit", "lost_in_the_post", "", "   ", null, undefined]) {
      const label = orderStatusLabel(status);
      assert.equal(label, UNKNOWN_STATUS_LABEL);
      assert.ok(!label.includes("_"));
    }
  });

  it("every label is sentence case: a capital first letter and no other capitals", () => {
    for (const status of knownOrderStatuses()) {
      const label = orderStatusLabel(status);
      assert.match(label, /^[A-Z][a-z ]+$/, `${status} -> ${label}`);
    }
  });

  it("avoids the words the brand does not use", () => {
    const all = [...knownOrderStatuses().map(orderStatusLabel), UNKNOWN_STATUS_LABEL].join(" ").toLowerCase();
    for (const word of ["luxury", "premium", "exclusive", "cheap", "hurry", "hot deal"]) assert.ok(!all.includes(word), word);
  });
});
