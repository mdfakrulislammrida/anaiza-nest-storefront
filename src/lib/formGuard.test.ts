import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calmMessage, HONEYPOT_FIELD, MIN_SECONDS, mobileProblem, msUntilSendable, proofFields, RENDERED_AT_FIELD } from "./formGuard.ts";

describe("the fields sent with a form", () => {
  it("uses the names the server looks for", () => {
    assert.equal(HONEYPOT_FIELD, "hp_field");
    assert.equal(RENDERED_AT_FIELD, "form_rendered_at");
  });

  it("carries the honeypot's value and the time as whole milliseconds", () => {
    assert.deepEqual(proofFields(1_700_000_000_000.4, ""), { hp_field: "", form_rendered_at: 1_700_000_000_000 });
    assert.equal(proofFields(1, "http://spam.example").hp_field, "http://spam.example");
  });
});

describe("waiting out the time trap", () => {
  const start = 1_700_000_000_000;

  it("waits the rest of the minimum, and no more", () => {
    assert.equal(msUntilSendable(start, "order", start + 1_000), 4_000);
    assert.equal(msUntilSendable(start, "order", start + 4_500), 500);
  });

  it("does not wait at all once the form has been open long enough", () => {
    assert.equal(msUntilSendable(start, "order", start + MIN_SECONDS.order * 1000), 0);
    assert.equal(msUntilSendable(start, "form", start + 60_000), 0);
  });

  it("is never held against a clock that is wrong", () => {
    assert.equal(msUntilSendable(start + 86_400_000, "order", start), 0);
  });

  it("keeps a margin over the server's own minimums", () => {
    // Server: order 4, form 3, newsletter 1 seconds.
    assert.ok(MIN_SECONDS.order > 4);
    assert.ok(MIN_SECONDS.form > 3);
    assert.ok(MIN_SECONDS.newsletter > 1);
  });
});

describe("what to say when a request fails", () => {
  it("uses the server's own words for too many tries and a busy shop", () => {
    assert.equal(calmMessage({ status: 429, message: "Please wait a minute." }, "x"), "Please wait a minute.");
    assert.equal(calmMessage({ status: 503, message: "We are busy." }, "x"), "We are busy.");
  });

  it("has calm words of its own when the server sent none", () => {
    assert.match(calmMessage({ status: 429 }, "x"), /Please wait a minute/);
    assert.match(calmMessage({ status: 503 }, "x"), /nothing has been sent/);
  });

  it("passes on a refusal that has no field to point at", () => {
    assert.equal(calmMessage({ status: 422, message: "Something went wrong with that form." }, "x"), "Something went wrong with that form.");
  });

  it("leaves field problems to the field", () => {
    assert.equal(calmMessage({ status: 422, message: "The given data was invalid.", errors: { name: ["x"] } }, "fallback"), "fallback");
  });

  it("says plainly when the shop could not be reached", () => {
    assert.match(calmMessage(new TypeError("Failed to fetch"), "x"), /could not reach the shop/);
  });

  it("falls back for anything else", () => {
    assert.equal(calmMessage(new Error("boom"), "Sorry."), "Sorry.");
    assert.equal(calmMessage(undefined, "Sorry."), "Sorry.");
  });
});

describe("the mobile number", () => {
  it("accepts a Bangladeshi mobile however it is typed", () => {
    for (const typed of ["01712345678", "+8801712345678", "8801712345678", "01712-345678", "0171 234 5678", " 01712345678 "]) {
      assert.equal(mobileProblem(typed), null, typed);
    }
  });

  it("asks for a number when there is none", () => {
    assert.equal(mobileProblem(""), "Please enter your mobile number so our courier can reach you.");
  });

  it("explains what a number looks like when it is not one", () => {
    for (const typed of ["12345", "0121234567", "01212345678", "017123456789", "abcdefghijk", "+1 202 555 0143"]) {
      assert.equal(
        mobileProblem(typed),
        "Please enter a Bangladeshi mobile number, like 01712 345678, so our courier can reach you.",
        typed,
      );
    }
  });
});
