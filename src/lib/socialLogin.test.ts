import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enabledProviders, showSocialDivider, unavailableMessage } from "./socialLogin.ts";

describe("which social buttons show", () => {
  it("shows only the providers that are on, Google first", () => {
    assert.deepEqual(enabledProviders({ google: true, facebook: true }), ["google", "facebook"]);
    assert.deepEqual(enabledProviders({ google: true, facebook: false }), ["google"]);
    assert.deepEqual(enabledProviders({ google: false, facebook: true }), ["facebook"]);
  });

  it("shows none when both are off, or when the API says nothing", () => {
    assert.deepEqual(enabledProviders({ google: false, facebook: false }), []);
    assert.deepEqual(enabledProviders({}), []);
    assert.deepEqual(enabledProviders(null), []);
    assert.deepEqual(enabledProviders(undefined), []);
  });

  it("is strict: only a true switches a provider on", () => {
    assert.deepEqual(enabledProviders({ google: "yes" as unknown as boolean }), []);
  });
});

describe("the divider", () => {
  it("shows with one provider or two, and not at all with none", () => {
    assert.equal(showSocialDivider({ google: true, facebook: false }), true);
    assert.equal(showSocialDivider({ google: false, facebook: true }), true);
    assert.equal(showSocialDivider({ google: true, facebook: true }), true);
    assert.equal(showSocialDivider({ google: false, facebook: false }), false);
    assert.equal(showSocialDivider(null), false);
  });
});

describe("the message for a provider that is off", () => {
  it("names the provider and points to email and password", () => {
    assert.equal(
      unavailableMessage("google"),
      "Signing in with Google is not available just now. Please sign in with your email and password.",
    );
    assert.ok(unavailableMessage("facebook").includes("Facebook"));
    assert.ok(unavailableMessage(null).includes("that service"));
  });
});
