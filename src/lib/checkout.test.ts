import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mobileProblem } from "./formGuard.ts";
import { beginCheckoutDue, deliveryChargeFor, deliveryHintText, freeDeliveryRemaining, isCheckoutPath, itemsLabel, totalCaption } from "./checkout.ts";

// The live shop's own settings: free over ৳10,000, ৳80 inside Dhaka city, ৳150 outside.
const rules = { free_delivery_threshold: 10000, delivery_fee_dhaka: 80, delivery_fee_outside_dhaka: 150 };

describe("the delivery charge", () => {
  it("is never shown before the area is chosen, however far the form has got", () => {
    assert.equal(deliveryChargeFor(rules, "", "", "", 2800), null);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "", "", 99999), null);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "", 2800), null);
    assert.equal(deliveryChargeFor(rules, "Sylhet", "Sylhet", "", 2800), null);
  });

  it("is the Dhaka fee for a Dhaka city thana, free only over the threshold", () => {
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "Banani", 2800), 80);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "Uttara East", 10000), 80, "exactly the threshold is not over it");
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "Mirpur", 10001), 0);
  });

  it("is the outside fee for Savar, Keraniganj and the other upazilas of Dhaka district, never free", () => {
    for (const thana of ["Savar", "Keraniganj", "Dhamrai", "Dohar", "Nawabganj"]) {
      assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", thana, 2800), 150, thana);
      assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", thana, 50000), 150, thana + " over the threshold");
    }
  });

  it("is the outside fee for Gazipur, Narayanganj and the rest of the Dhaka division, never free", () => {
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Gazipur", "Gazipur Sadar", 2800), 150);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Gazipur", "Gazipur Sadar", 10001), 150);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Narayanganj", "Narayanganj Sadar", 50000), 150);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Tangail", "Tangail Sadar", 10001), 150);
  });

  it("is the outside fee for every other division, never free", () => {
    assert.equal(deliveryChargeFor(rules, "Sylhet", "Sylhet", "Sylhet Sadar", 2800), 150);
    assert.equal(deliveryChargeFor(rules, "Sylhet", "Sylhet", "Sylhet Sadar", 50000), 150);
  });

  it("follows the address as it changes, so going back and forth never leaves an old fee", () => {
    const walk: [string, string, string, number | null][] = [
      ["Dhaka", "Dhaka", "Banani", 80],
      ["Dhaka", "Dhaka", "", null],
      ["Dhaka", "Dhaka", "Savar", 150],
      ["Dhaka", "Gazipur", "", null],
      ["Dhaka", "Gazipur", "Gazipur Sadar", 150],
      ["Dhaka", "Dhaka", "", null],
      ["Dhaka", "Dhaka", "Wari", 80],
    ];

    for (const [division, district, thana, wanted] of walk) assert.equal(deliveryChargeFor(rules, division, district, thana, 2800), wanted, `${district} / ${thana}`);
  });

  it("uses the city list the API sends when it has one", () => {
    const withApi = { ...rules, dhaka_city: { division: "Dhaka", district: "Dhaka", thanas: ["Banani"], outside_upazilas: ["Savar"] } };

    assert.equal(deliveryChargeFor(withApi, "Dhaka", "Dhaka", "Banani", 2800), 80);
    assert.equal(deliveryChargeFor(withApi, "Dhaka", "Dhaka", "Gulshan", 2800), 150);
  });

  it("says both fees, calmly, until the area is chosen", () => {
    assert.equal(
      deliveryHintText(rules, (amount) => `৳${amount}`),
      "Delivery ৳80 in Dhaka city, ৳150 elsewhere. We will confirm once you choose your area.",
    );
  });
});

describe("the free delivery nudge", () => {
  it("gives the amount still to add, one taka over the gap because the order must be MORE than the threshold", () => {
    assert.equal(freeDeliveryRemaining(10000, "inside", 7300), 2701);
    assert.equal(freeDeliveryRemaining(10000, "inside", 10000), 1);
  });

  it("is silent when the order is already free, outside Dhaka, before a zone, or when the shop has no threshold", () => {
    assert.equal(freeDeliveryRemaining(10000, "inside", 10001), null);
    assert.equal(freeDeliveryRemaining(10000, "outside", 5000), null);
    assert.equal(freeDeliveryRemaining(10000, null, 5000), null);
    assert.equal(freeDeliveryRemaining(undefined, "inside", 5000), null, "settings not loaded: nothing is assumed");
    assert.equal(freeDeliveryRemaining(null, "inside", 5000), null);
    assert.equal(freeDeliveryRemaining(0, "inside", 5000), null);
  });
});

describe("small wording", () => {
  it("says delivery is still to come until there is a charge", () => {
    assert.equal(totalCaption(null), "+ delivery");
    assert.equal(totalCaption(0), null);
    assert.equal(totalCaption(80), null);
  });

  it("counts quantities, not lines", () => {
    assert.equal(itemsLabel(1), "1 item");
    assert.equal(itemsLabel(3), "3 items");
  });

  it("knows the checkout path and nothing that only starts like it", () => {
    assert.ok(isCheckoutPath("/checkout"));
    assert.ok(isCheckoutPath("/checkout/"));
    assert.ok(!isCheckoutPath("/checkout-help"));
    assert.ok(!isCheckoutPath("/order-confirmation"));
    assert.ok(!isCheckoutPath(null));
  });
});

describe("begin_checkout", () => {
  it("waits for the cart, which is read after the first render, and fires once", () => {
    // The page just opened: the cart is not read yet. The old code fired here, found nothing, and never fired again.
    assert.equal(beginCheckoutDue({ embedded: false, cartReady: false, itemCount: 0, alreadyFired: false }), false);
    assert.equal(beginCheckoutDue({ embedded: false, cartReady: true, itemCount: 2, alreadyFired: false }), true);
    assert.equal(beginCheckoutDue({ embedded: false, cartReady: true, itemCount: 2, alreadyFired: true }), false);
  });

  it("is not for an empty cart, and not for the landing page's form (it starts when the form is touched)", () => {
    assert.equal(beginCheckoutDue({ embedded: false, cartReady: true, itemCount: 0, alreadyFired: false }), false);
    assert.equal(beginCheckoutDue({ embedded: true, cartReady: true, itemCount: 2, alreadyFired: false }), false);
  });
});

describe("the phone number rule", () => {
  // The rule asked for: ^(?:\+?880|0)1[3-9]\d{8}$ after removing spaces and dashes.
  const asked = (value: string) => /^(?:\+?880|0)1[3-9]\d{8}$/.test(value.replace(/[\s-]/g, ""));

  it("accepts and refuses exactly the numbers the asked-for rule does", () => {
    const samples = [
      "01712345678", "+8801712345678", "8801712345678", "01712 345678", "0171-234-5678", "+880 1712-345678", "01212345678", "0171234567", "017123456789",
      "1712345678", "881712345678", "+88017123456", "01312345678", "01912345678", "01012345678", "", "abc", "0171234567a", "+8801312345678", "00171234567",
    ];

    for (const sample of samples) {
      assert.equal(mobileProblem(sample) === null, asked(sample), JSON.stringify(sample));
    }
  });
});
