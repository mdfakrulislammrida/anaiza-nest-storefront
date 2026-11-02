import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { knownOrderStatuses, orderStatusLabel, orderStatusNote, UNKNOWN_STATUS_LABEL } from "./orderStatus.ts";

describe("order status labels", () => {
  it("names the statuses the shop can send in plain words", () => {
    assert.equal(orderStatusLabel("pending"), "Order received");
    assert.equal(orderStatusLabel("processing"), "Being prepared");
    assert.equal(orderStatusLabel("shipped"), "On its way");
    assert.equal(orderStatusLabel("delivered"), "Delivered");
    assert.equal(orderStatusLabel("cancelled"), "Cancelled");
    assert.equal(orderStatusLabel("returned"), "Returned");
  });

  it("calls the pre-order status Pre-order, never In progress or the raw code", () => {
    assert.equal(orderStatusLabel("preorder"), "Pre-order");
    for (const spelling of [" Preorder ", "PREORDER", "pre-order", "Pre order", "pre_order"]) assert.equal(orderStatusLabel(spelling), "Pre-order", spelling);
    assert.notEqual(orderStatusLabel("preorder"), UNKNOWN_STATUS_LABEL);
    assert.ok(!orderStatusLabel("preorder").includes("preorder"));
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
      assert.match(label, /^[A-Z][a-z -]+$/, `${status} -> ${label}`);
    }
  });

  it("avoids the words the brand does not use", () => {
    const notes = knownOrderStatuses().map(orderStatusNote).filter((note) => note !== null);
    const all = [...knownOrderStatuses().map(orderStatusLabel), ...notes, UNKNOWN_STATUS_LABEL].join(" ").toLowerCase();
    for (const word of ["luxury", "premium", "exclusive", "cheap", "hurry", "hot deal"]) assert.ok(!all.includes(word), word);
  });
});

describe("the line beside a status", () => {
  it("explains a pre-order calmly, in sentence case, and names WhatsApp", () => {
    assert.equal(orderStatusNote("preorder"), "This item is on pre-order. We will message you on WhatsApp as soon as it is ready to ship.");
    assert.equal(orderStatusNote("Pre-order"), orderStatusNote("preorder"));
  });

  it("has no line for the other statuses, an unknown one, or none", () => {
    for (const status of ["pending", "processing", "shipped", "delivered", "in_transit", "", null, undefined]) assert.equal(orderStatusNote(status), null, String(status));
  });

  it("still shows the general label for an unknown status", () => {
    assert.equal(orderStatusLabel("awaiting_courier"), UNKNOWN_STATUS_LABEL);
  });
});
