import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

// Microsoft Clarity records the screen. Wherever a customer's name, phone, address or email is shown or typed, the container around it carries
// data-clarity-mask="true". Each row: the file, the opening tag of the container, and what it holds. (The headless check, npm run tracking:check, also loads the built
// pages and asserts that the real text and fields sit inside a masked element.)
const MASKED: [string, string, string][] = [
  ["src/app/order-confirmation/page.tsx", `<div className="mx-auto max-w-2xl px-4 py-16 sm:px-6" data-clarity-mask="true">`, "the whole confirmation: name, address, email, phone, gift note"],
  ["src/app/track-order/page.tsx", `<form onSubmit={handleSubmit} className="mt-8 space-y-4" data-clarity-mask="true">`, "the phone number that is typed"],
  ["src/app/track-order/page.tsx", `<div className="mt-10 rounded-btn border border-linen p-6" data-clarity-mask="true">`, "the order that comes back"],
  ["src/app/account/page.tsx", `<div className="mx-auto max-w-md px-4 py-16 sm:px-6" data-clarity-mask="true">`, "the account: name and email, and the sign-in and registration forms (twice)"],
  ["src/components/CheckoutForm.tsx", `id="checkout-form"\n      data-clarity-mask="true"`, "the checkout form: name, phone, address, wallet number"],
  ["src/components/CheckoutForm.tsx", `<section data-clarity-mask="true" className="hidden rounded-btn`, "the order summary beside the form"],
  ["src/components/CheckoutForm.tsx", `<aside className="w-full" data-clarity-mask="true">`, "the order summary under the form"],
  ["src/components/ContactForm.tsx", `<form onSubmit={handleSubmit} className="relative space-y-4" data-clarity-mask="true">`, "the contact form: name, email, phone"],
  ["src/components/CorporateEnquiryForm.tsx", `<form onSubmit={handleSubmit} className="space-y-4" data-clarity-mask="true">`, "the corporate enquiry form"],
];

describe("Clarity masking", () => {
  for (const [file, container, holds] of MASKED) {
    it(`${file}: ${holds}`, () => {
      assert.ok(source(file).replace(/\r\n/g, "\n").includes(container), `${file} has ${container}`);
    });
  }

  it("the account page masks both of its views (signed in, signed out)", () => {
    assert.equal(source("src/app/account/page.tsx").split(`data-clarity-mask="true"`).length - 1, 2);
  });
});

// The private pages have a title of their own, in the shop's format ("<Page> | Anaiza Nest", from the template in the root layout), and stay noindex.
const TITLES: [string, string][] = [
  ["src/app/checkout/page.tsx", "Checkout"],
  ["src/app/order-confirmation/layout.tsx", "Order confirmation"],
  ["src/app/cart/layout.tsx", "Your cart"],
  ["src/app/account/layout.tsx", "Account"],
  ["src/app/track-order/layout.tsx", "Track your order"],
];

describe("titles of the private pages", () => {
  for (const [file, title] of TITLES) {
    it(`${file} is "${title} | Anaiza Nest" and is still noindex`, () => {
      const text = source(file);

      assert.ok(text.includes(`title: "${title}",`));
      assert.ok(text.includes("robots: privatePageRobots(),"));
    });
  }

  it("the root layout makes the title '<Page> | Anaiza Nest'", () => {
    // The template is written with the shop's name in a constant (SITE_NAME = "Anaiza Nest"): "%s | ${SITE_NAME}".
    assert.ok(source("src/app/layout.tsx").includes("template: `%s | ${SITE_NAME}`"));
  });
});
