import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordProblems, tokenFromSearch } from "./passwordReset.ts";

describe("the new password", () => {
  it("accepts a long enough password that matches its confirmation", () => {
    assert.deepEqual(passwordProblems("a-brand-new-one", "a-brand-new-one"), {});
    assert.deepEqual(passwordProblems("12345678", "12345678"), {});
  });

  it("asks for at least eight characters", () => {
    assert.equal(passwordProblems("short", "short").password, "Please choose a password of at least 8 characters.");
    assert.equal(passwordProblems("", "").password, "Please choose a password of at least 8 characters.");
  });

  it("asks for the two to match", () => {
    assert.deepEqual(passwordProblems("a-brand-new-one", "a-brand-new-two"), { password_confirmation: "The two passwords do not match." });
  });
});

describe("the link's token", () => {
  it("is read from the address", () => {
    assert.equal(tokenFromSearch("?token=abc.def"), "abc.def");
    assert.equal(tokenFromSearch("?x=1&token=abc"), "abc");
  });

  it("is null when there is none", () => {
    assert.equal(tokenFromSearch(""), null);
    assert.equal(tokenFromSearch("?token="), null);
    assert.equal(tokenFromSearch("?other=1"), null);
  });
});
