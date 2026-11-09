// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { BD_MOBILE_PATTERN, PHONE_MAX_LENGTH, PHONE_MESSAGE, PHONE_PREFIX, isValidBdMobile, normalizePhoneInput, phoneAccessibleName, phoneView } from "./phone.ts";
import { buildContactHashes, internationalDigits } from "./userData.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

describe("normalising what is typed, pasted or autofilled", () => {
  it("turns every way of writing the number into the local 11 digits", () => {
    for (const typed of ["+8801712345678", "8801712345678", "01712-345 678", "008801712345678", "+88 01712-345678", "+880 1712-345678", "1712345678", " 01712345678 "]) {
      assert.equal(normalizePhoneInput(typed), "01712345678", typed);
    }
  });

  it("keeps digits only and never takes more than 11", () => {
    assert.equal(normalizePhoneInput("abc0171x2"), "01712");
    assert.equal(normalizePhoneInput("017123456789999"), "01712345678");
    assert.equal(normalizePhoneInput("++--"), "");
    assert.equal(normalizePhoneInput(""), "");
    assert.equal(normalizePhoneInput(null), "");
    assert.equal(normalizePhoneInput(undefined), "");
  });

  it("is lenient while typing: a partial number is kept as it is, nothing is refused", () => {
    for (const partial of ["0", "01", "017", "0171234"]) assert.equal(normalizePhoneInput(partial), partial);
    // 88 is only a country code when what follows starts with 01: "881" or "88" alone stay as typed
    assert.equal(normalizePhoneInput("88"), "88");
    assert.equal(normalizePhoneInput("881"), "881");
    assert.equal(normalizePhoneInput("8801"), "01");
  });

  it("is stable: normalising twice gives the same value", () => {
    for (const typed of ["+8801712345678", "1712345678", "01712-345 678", "017"]) {
      const once = normalizePhoneInput(typed);
      assert.equal(normalizePhoneInput(once), once, typed);
    }
  });

  it("copes with a browser's autofill of +8801...", () => {
    const filled = normalizePhoneInput("+8801912345678");
    assert.equal(filled, "01912345678");
    assert.equal(isValidBdMobile(filled), true);
    assert.ok("+88 01912-345678".length <= PHONE_MAX_LENGTH, "the longest usual autofill fits the field before it is normalised");
  });
});

describe("validating", () => {
  it("accepts 01, then 3 to 9, then 8 digits", () => {
    for (const ok of ["01712345678", "01312345678", "01912345678"]) assert.equal(isValidBdMobile(ok), true, ok);
  });

  it("refuses everything else", () => {
    for (const bad of ["", "0171234567", "017123456789", "01112345678", "01012345678", "02123456789", "+8801712345678", "abcdefghijk"]) assert.equal(isValidBdMobile(bad), false, bad);
  });

  it("uses the same rule in the field's pattern attribute", () => {
    assert.equal(new RegExp(`^${BD_MOBILE_PATTERN}$`).test("01712345678"), true);
    assert.equal(new RegExp(`^${BD_MOBILE_PATTERN}$`).test("01212345678"), false);
  });
});

describe("how the field looks", () => {
  it("is neutral while typing, and nothing is red before anything was typed", () => {
    assert.deepEqual(phoneView("", false, false), { state: "neutral", message: null });
    assert.deepEqual(phoneView("", true, false), { state: "neutral", message: null });
    assert.deepEqual(phoneView("0171", false, false), { state: "neutral", message: null });
  });

  it("is green with no message as soon as the number is valid", () => {
    assert.deepEqual(phoneView("01712345678", false, false), { state: "valid", message: null });
    assert.deepEqual(phoneView("01712345678", true, true), { state: "valid", message: null });
  });

  it("is red with the short message after the field was left with a wrong number", () => {
    assert.deepEqual(phoneView("0171", true, false), { state: "invalid", message: PHONE_MESSAGE });
    assert.equal(PHONE_MESSAGE, "Enter an 11-digit mobile number, e.g. 01712345678");
  });

  it("is red on submit, even when it is empty", () => {
    assert.deepEqual(phoneView("", false, true), { state: "invalid", message: PHONE_MESSAGE });
    assert.deepEqual(phoneView("0171", false, true), { state: "invalid", message: PHONE_MESSAGE });
  });

  it("names the field with its label and the country code", () => {
    assert.equal(PHONE_PREFIX, "+88");
    assert.equal(phoneAccessibleName("Mobile number"), "Mobile number, +88");
  });
});

describe("tracking: the same number gives the same hash, and nothing extra", () => {
  it("hashes 8801712345678 whether it was typed with or without +88", async () => {
    const expected = sha("8801712345678");

    for (const typed of ["01712345678", "+8801712345678", "8801712345678", "01712-345 678"]) {
      // what the form submits is the field's value: the normalised local number
      const submitted = normalizePhoneInput(typed);
      assert.equal(submitted, "01712345678", typed);

      assert.equal(internationalDigits(submitted), "8801712345678", typed);
      const hashes = await buildContactHashes({ email: "", phone: submitted });
      assert.deepEqual(hashes, { sha256_phone_number: expected }, typed);
    }
  });

  it("gives the same hash for a number typed raw with +88 (before the field) and the field's value", async () => {
    const raw = await buildContactHashes({ email: "", phone: "+8801712345678" });
    const field = await buildContactHashes({ email: "", phone: normalizePhoneInput("+8801712345678") });
    assert.deepEqual(raw, field);
  });

  it("puts no characters other than the hash into the data layer fields", async () => {
    const hashes = await buildContactHashes({ email: "", phone: normalizePhoneInput("+8801712345678") });
    assert.ok(hashes);
    assert.deepEqual(Object.keys(hashes), ["sha256_phone_number"]);
    assert.match(hashes.sha256_phone_number ?? "", /^[0-9a-f]{64}$/);
  });
});

describe("the field in the page: the +88 is a label, not part of the value", () => {
  const field = source("../components/PhoneField.tsx");

  it("shows the prefix as a hidden, name-less label outside the input", () => {
    const span = field.match(/<span[^>]*>\s*\{PHONE_PREFIX\}\s*<\/span>/);
    assert.ok(span, "the prefix span is there");
    assert.match(span[0], /aria-hidden="true"/);
    assert.doesNotMatch(span[0], /name=/);
    assert.doesNotMatch(span[0], /<input/);
  });

  it("submits only the input, under the form's own name, with a phone keypad and national autofill", () => {
    const input = field.match(/<input[\s\S]*?\/>/);
    assert.ok(input, "the input is there");
    assert.match(input[0], /name=\{name\}/);
    assert.match(input[0], /type="tel"/);
    assert.match(input[0], /inputMode="numeric"/);
    assert.match(input[0], /autoComplete="tel-national"/);
    assert.match(input[0], /aria-label=\{phoneAccessibleName\(label\)\}/);
    assert.match(input[0], /maxLength=\{PHONE_MAX_LENGTH\}/);
    assert.equal(field.match(/<input/g)?.length, 1, "one input only: no hidden field that could carry +88");
    assert.doesNotMatch(field, /type="hidden"/);
  });

  it("never puts the prefix into the value", () => {
    assert.doesNotMatch(field, /value=\{[^}]*PHONE_PREFIX/);
    assert.doesNotMatch(field, /defaultValue=\{[^}]*PHONE_PREFIX/);
    assert.doesNotMatch(field, /\.value\s*=\s*[^;]*PHONE_PREFIX/);
  });

  it("is used by every form that takes a number, under the names the forms read", () => {
    const forms: [string, string][] = [
      ["../components/CheckoutForm.tsx", "customer_phone"],
      ["../components/WalletPaymentPanel.tsx", "payment_sender_number"],
      ["../app/account/page.tsx", "phone"],
      ["../components/ContactForm.tsx", "phone"],
      ["../components/CorporateEnquiryForm.tsx", "phone"],
      ["../app/track-order/page.tsx", "phone"],
      ["../components/ProductReviews.tsx", "phone"],
    ];

    for (const [path, name] of forms) {
      const page = source(path);
      assert.match(page, /import PhoneField from "@\/components\/PhoneField"/, path);
      assert.match(page, new RegExp(`<PhoneField[^>]*name="${name}"`), path);
      assert.doesNotMatch(page, new RegExp(`<input[^>]*name="${name}"[^>]*type="tel"|<input[^>]*type="tel"[^>]*name="${name}"`), `${path}: no plain phone input left`);
    }
  });
});
