// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillInstructions, isWalletMethod, normalizeBdNumber, paymentStateMessage, walletFieldProblems } from "./payment.ts";

describe("wallet field checks", () => {
  it("accepts a normal number and a normal transaction ID", () => {
    assert.deepEqual(walletFieldProblems("01733333333", "9AB7C2D1XY"), {});
  });

  it("tidies spaces, dashes and +88 before checking the number", () => {
    assert.equal(normalizeBdNumber(" +88 01733-333 333 "), "01733333333");
    assert.deepEqual(walletFieldProblems("+8801733333333", "abc123"), {});
  });

  it("asks for both fields when they are empty", () => {
    const problems = walletFieldProblems("", "  ");
    assert.deepEqual(Object.keys(problems).sort(), ["payment_sender_number", "payment_trx_id"]);
    assert.match(problems.payment_sender_number[0], /number you paid from/);
    assert.match(problems.payment_trx_id[0], /transaction ID/);
  });

  it("refuses numbers that are not Bangladeshi mobiles", () => {
    for (const bad of ["0171111", "02123456789", "01011111111", "abcdefghijk", "017333333331"]) {
      assert.ok(walletFieldProblems(bad, "ABC123").payment_sender_number, bad);
    }
  });

  it("holds the transaction ID to 6 to 20 letters and digits", () => {
    for (const bad of ["ABC12", "A".repeat(21), "ABC 123", "ABC-123", "টাকা১২৩৪৫"]) {
      assert.ok(walletFieldProblems("01733333333", bad).payment_trx_id, bad);
    }
    for (const good of ["ABC123", "A".repeat(20), "abc123XYZ"]) {
      assert.equal(walletFieldProblems("01733333333", good).payment_trx_id, undefined, good);
    }
  });
});

describe("payment wording", () => {
  it("says where a payment stands in plain words", () => {
    assert.equal(paymentStateMessage("awaiting_verification"), "We are checking your payment, we will confirm it shortly.");
    assert.equal(paymentStateMessage("verified"), "Payment received.");
    assert.equal(paymentStateMessage("failed"), "We could not match this payment, please contact us.");
    assert.equal(paymentStateMessage("cod"), null);
    assert.equal(paymentStateMessage(undefined), null);
  });

  it("fills the amount and number into the steps", () => {
    assert.equal(fillInstructions("<li>Send {{amount}} to {{number}}.</li>", "৳1,530", "01711111111"), "<li>Send ৳1,530 to 01711111111.</li>");
    assert.match(fillInstructions("Send {{amount}}.", null, "x"), /total shown in your order summary/);
  });

  it("knows which methods are wallets", () => {
    assert.ok(isWalletMethod("bkash") && isWalletMethod("nagad") && isWalletMethod("rocket"));
    assert.ok(!isWalletMethod("cod"));
  });
});
