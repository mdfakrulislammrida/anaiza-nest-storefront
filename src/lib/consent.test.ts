// Run with `npm test` (Node's built-in test runner; no extra dependency).
// Runs the real inline consent script against a stand-in browser, to check what loads and what Consent Mode says.
import assert from "node:assert/strict";
import vm from "node:vm";
import { describe, it } from "node:test";
import { consentBootstrapSource, type ConsentConfig } from "./consentBootstrap.ts";

const IDS = { gtm: "GTM-TEST", ga4: null, meta: "1234567890", tiktok: "TTPIXEL" };

function run(config: Partial<ConsentConfig>, savedCookie = "") {
  const scripts: string[] = [];
  let cookie = savedCookie;
  const document = {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
    createElement: () => ({}) as Record<string, unknown>,
    getElementsByTagName: () => [
      { parentNode: { insertBefore: (element: { src?: string }) => scripts.push(String(element.src)) } },
    ],
  };
  const events: unknown[] = [];
  const sandbox: Record<string, unknown> = {
    document,
    location: { protocol: "https:" },
    CustomEvent: class {
      detail: unknown;
      constructor(_name: string, init: { detail: unknown }) {
        this.detail = init.detail;
      }
    },
    dispatchEvent: (event: unknown) => events.push(event),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(consentBootstrapSource({ enabled: true, mode: "notice", ...IDS, ...config } as ConsentConfig), sandbox);

  // Plain data from this realm, so it compares with deepEqual.
  const snapshot = () =>
    JSON.parse(JSON.stringify(Array.from(sandbox.dataLayer as ArrayLike<unknown>[], (item) => (Array.isArray(item) || typeof (item as ArrayLike<unknown>).length === "number" ? Array.from(item as ArrayLike<unknown>) : item)))) as unknown[];
  const dataLayer = snapshot();
  return {
    scripts,
    dataLayer,
    events,
    cookie: () => cookie,
    consent: sandbox.anaizaConsent as {
      set: (analytics: boolean, marketing: boolean) => void;
      effective: () => { a: boolean; m: boolean };
      get: () => { a: boolean; m: boolean } | null;
    },
    layer: () => snapshot() as unknown[][],
  };
}

const loaded = (scripts: string[], needle: string) => scripts.some((src) => src.includes(needle));

describe("consent script, notice mode", () => {
  it("allows everything until the visitor chooses, and sets Consent Mode before GTM starts", () => {
    const page = run({ mode: "notice" });

    assert.deepEqual(page.dataLayer[0], [
      "consent",
      "default",
      { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" },
    ]);
    assert.equal((page.dataLayer[1] as { event?: string }).event, "gtm.js");
    assert.ok(loaded(page.scripts, "googletagmanager.com/gtm.js?id=GTM-TEST"));
    assert.ok(loaded(page.scripts, "fbevents.js"));
    assert.ok(loaded(page.scripts, "analytics.tiktok.com"));
  });

  it("honours a rejection: signals denied and the pixels do not load", () => {
    const page = run({ mode: "notice" }, "anaiza_consent=a0m0");

    assert.deepEqual((page.dataLayer[0] as unknown[])[2], {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    assert.ok(loaded(page.scripts, "gtm.js"));
    assert.ok(!loaded(page.scripts, "fbevents.js"));
    assert.ok(!loaded(page.scripts, "analytics.tiktok.com"));
  });
});

describe("consent script, opt-in mode", () => {
  it("denies everything by default and keeps the pixels back, while GTM still loads", () => {
    const page = run({ mode: "opt_in" });

    assert.deepEqual((page.dataLayer[0] as unknown[])[2], {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
    assert.ok(loaded(page.scripts, "gtm.js"));
    assert.ok(!loaded(page.scripts, "fbevents.js"));
    assert.ok(!loaded(page.scripts, "analytics.tiktok.com"));
    assert.equal(page.consent.get(), null);
    assert.deepEqual({ ...page.consent.effective() }, { a: false, m: false });
  });

  it("lets analytics through on its own, without the pixels", () => {
    const page = run({ mode: "opt_in" });

    page.consent.set(true, false);

    const update = page.layer().find((item) => item[0] === "consent" && item[1] === "update");
    assert.deepEqual(update?.[2], { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    assert.ok(!loaded(page.scripts, "fbevents.js"));
    assert.ok(!loaded(page.scripts, "analytics.tiktok.com"));
  });

  it("loads the pixels the moment marketing is allowed, and keeps the choice for 12 months", () => {
    const page = run({ mode: "opt_in" });

    page.consent.set(true, true);

    assert.ok(loaded(page.scripts, "fbevents.js"));
    assert.ok(loaded(page.scripts, "analytics.tiktok.com"));
    assert.match(page.cookie(), /^anaiza_consent=a1m1; Max-Age=31536000; Path=\/; SameSite=Lax; Secure$/);
    assert.deepEqual({ ...page.consent.get() }, { a: true, m: true });
    assert.equal(page.events.length, 1);
  });

  it("does not load a pixel twice if the visitor changes their mind and back", () => {
    const page = run({ mode: "opt_in" });

    page.consent.set(true, true);
    page.consent.set(false, false);
    page.consent.set(true, true);

    assert.equal(page.scripts.filter((src) => src.includes("fbevents.js")).length, 1);
  });

  it("starts straight from a saved choice, with no wait", () => {
    const page = run({ mode: "opt_in" }, "foo=bar; anaiza_consent=a1m1");

    const defaults = (page.dataLayer[0] as unknown[])[2] as Record<string, unknown>;
    assert.equal(defaults.ad_storage, "granted");
    assert.equal(defaults.wait_for_update, undefined);
    assert.ok(loaded(page.scripts, "fbevents.js"));
  });

  it("ignores a cookie it does not understand", () => {
    const page = run({ mode: "opt_in" }, "anaiza_consent=nonsense");

    assert.ok(!loaded(page.scripts, "fbevents.js"));
    assert.equal(page.consent.get(), null);
  });
});

describe("consent script, banner off", () => {
  it("allows everything even if the mode says opt-in", () => {
    const page = run({ enabled: false, mode: "opt_in" });

    assert.equal(((page.dataLayer[0] as unknown[])[2] as Record<string, unknown>).ad_storage, "granted");
    assert.ok(loaded(page.scripts, "fbevents.js"));
  });
});

describe("consent script, the other tags", () => {
  it("falls back to a direct GA4 tag only when there is no GTM container", () => {
    const withGtm = run({ ga4: "G-ABC123" });
    assert.ok(!loaded(withGtm.scripts, "gtag/js"));

    const alone = run({ gtm: null, ga4: "G-ABC123" });
    assert.ok(loaded(alone.scripts, "gtag/js?id=G-ABC123"));
    assert.ok(!loaded(alone.scripts, "gtm.js"));
  });

  it("does nothing, and sets no signals, when no tag is configured", () => {
    const page = run({ gtm: null, ga4: null, meta: null, tiktok: null, mode: "opt_in" });

    assert.deepEqual(page.scripts, []);
    assert.deepEqual(page.dataLayer, []);
  });

  it("cannot be broken out of by an odd id", () => {
    const source = consentBootstrapSource({ enabled: true, mode: "notice", gtm: "</script><script>alert(1)", ga4: null, meta: null, tiktok: null });

    assert.ok(!source.includes("</script>"));
  });
});
