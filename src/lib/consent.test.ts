// Run with `npm test` (Node's built-in test runner; no extra dependency).
// Runs the real inline consent script against a stand-in browser, to check what loads and what Consent Mode says.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it } from "node:test";
import { consentBootstrapSource, type ConsentConfig } from "./consentBootstrap.ts";

// Direct mode: no GTM container, so the site loads GA4, the Meta pixel and the TikTok pixel itself.
const IDS = { gtm: null, ga4: "G-TESTGA4", meta: "1234567890", tiktok: "TTPIXEL" };
// GTM mode: a container is set, so GTM owns every browser tag and the site loads none of the others (whatever other IDs are saved).
const GTM_IDS = { gtm: "GTM-TEST", ga4: "G-TESTGA4", meta: "1234567890", tiktok: "TTPIXEL" };

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
  it("allows everything until the visitor chooses, and sets Consent Mode before any tag starts", () => {
    const page = run({ mode: "notice" });

    assert.deepEqual(page.dataLayer[0], [
      "consent",
      "default",
      { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" },
    ]);
    assert.equal((page.dataLayer[1] as unknown[])[0], "js");
    assert.ok(loaded(page.scripts, "googletagmanager.com/gtag/js?id=G-TESTGA4"));
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
    assert.ok(loaded(page.scripts, "gtag/js"));
    assert.ok(!loaded(page.scripts, "fbevents.js"));
    assert.ok(!loaded(page.scripts, "analytics.tiktok.com"));
  });
});

describe("consent script, opt-in mode", () => {
  it("denies everything by default and keeps the pixels back, while the analytics tag still loads", () => {
    const page = run({ mode: "opt_in" });

    assert.deepEqual((page.dataLayer[0] as unknown[])[2], {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
    assert.ok(loaded(page.scripts, "gtag/js"));
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
    const withGtm = run({ gtm: "GTM-TEST", ga4: "G-ABC123" });
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

// The tags' own files are fetched late on the live site: what they must hear is set up at once, the files wait for a touch or for 4 seconds.
function runDeferred(config: Partial<ConsentConfig>, path = "/", readyState = "loading") {
  const scripts: string[] = [];
  const handlers = new Map<string, (() => void)[]>();
  const timers: { fn: () => void; ms: number }[] = [];
  const document = {
    cookie: "",
    readyState,
    createElement: () => ({}) as Record<string, unknown>,
    getElementsByTagName: () => [{ parentNode: { insertBefore: (element: { src?: string }) => scripts.push(String(element.src)) } }],
  };
  const sandbox: Record<string, unknown> = {
    document,
    location: { protocol: "https:", pathname: path },
    CustomEvent: class {},
    dispatchEvent: () => true,
    addEventListener: (name: string, fn: () => void) => handlers.set(name, [...(handlers.get(name) ?? []), fn]),
    removeEventListener: (name: string, fn: () => void) => handlers.set(name, (handlers.get(name) ?? []).filter((item) => item !== fn)),
    setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(consentBootstrapSource({ enabled: true, mode: "notice", ...IDS, defer: true, ...config } as ConsentConfig), sandbox);

  return {
    scripts,
    timers,
    fire: (name: string) => [...(handlers.get(name) ?? [])].forEach((fn) => fn()),
    listening: () => [...handlers.entries()].filter(([, list]) => list.length > 0).map(([name]) => name).sort(),
    sandbox,
    consent: sandbox.anaizaConsent as { set: (analytics: boolean, marketing: boolean) => void },
  };
}

describe("consent script, tags fetched late", () => {
  it("sets up Consent Mode, the data layer and the pixels' queues at once, and fetches no file yet", () => {
    const page = runDeferred({});

    assert.deepEqual(page.scripts, []);
    const layer = Array.from(page.sandbox.dataLayer as ArrayLike<unknown>[], (item) => (Array.isArray(item) || typeof (item as ArrayLike<unknown>).length === "number" ? Array.from(item as ArrayLike<unknown>) : item));
    assert.equal(JSON.parse(JSON.stringify(layer[0]))[0], "consent");
    assert.equal(JSON.parse(JSON.stringify(layer[1]))[0], "js");
    assert.equal(typeof page.sandbox.fbq, "function", "the Meta queue is there, so an event sent now is kept");
    assert.ok(page.sandbox.ttq, "the TikTok queue is there");
  });

  it("fetches every file, once each, on the first touch", () => {
    const page = runDeferred({});

    assert.ok(page.listening().includes("pointerdown") && page.listening().includes("scroll") && page.listening().includes("keydown"));
    page.fire("pointerdown");

    assert.equal(page.scripts.length, 3);
    assert.ok(loaded(page.scripts, "googletagmanager.com/gtag/js?id=G-TESTGA4"));
    assert.ok(loaded(page.scripts, "fbevents.js"));
    assert.ok(loaded(page.scripts, "analytics.tiktok.com"));

    page.fire("scroll");
    assert.equal(page.scripts.length, 3, "a second touch fetches nothing more");
    assert.deepEqual(page.listening(), ["load"].filter((name) => page.listening().includes(name)), "the touch listeners are gone");
  });

  it("fetches them 4 seconds after the page has loaded when nobody touches it", () => {
    const page = runDeferred({});

    page.fire("load");
    assert.equal(page.timers.length, 1);
    assert.equal(page.timers[0].ms, 4000);
    assert.deepEqual(page.scripts, []);

    page.timers[0].fn();
    assert.equal(page.scripts.length, 3);
  });

  it("starts the 4 seconds at once when the page has already loaded", () => {
    const page = runDeferred({}, "/", "complete");

    assert.equal(page.timers[0].ms, 4000);
  });

  it("fetches at once in the checkout and on the confirmation, where a sale must be counted", () => {
    assert.equal(runDeferred({}, "/checkout").scripts.length, 3);
    assert.equal(runDeferred({}, "/order-confirmation").scripts.length, 3);
  });

  it("still keeps a rejected pixel away, and loads one that was allowed while waiting only once", () => {
    const rejected = runDeferred({}, "/", "loading");
    rejected.consent.set(true, false);
    rejected.fire("pointerdown");
    assert.ok(loaded(rejected.scripts, "gtag/js"));
    assert.ok(!loaded(rejected.scripts, "fbevents.js"), "marketing was not allowed");

    const allowed = runDeferred({}, "/", "loading");
    allowed.consent.set(true, true);
    allowed.fire("pointerdown");
    allowed.fire("keydown");
    assert.equal(allowed.scripts.filter((src) => src.includes("fbevents.js")).length, 1);
  });

  it("fetches a pixel that was rejected while waiting if the visitor allows it afterwards", () => {
    const page = runDeferred({}, "/", "loading");

    page.consent.set(true, false);
    page.fire("pointerdown");
    assert.ok(!loaded(page.scripts, "fbevents.js") && !loaded(page.scripts, "analytics.tiktok.com"));

    page.consent.set(true, true);
    assert.equal(page.scripts.filter((src) => src.includes("fbevents.js")).length, 1);
    assert.equal(page.scripts.filter((src) => src.includes("analytics.tiktok.com")).length, 1);
  });

  it("without the setting it behaves as before: everything at once", () => {
    const page = runDeferred({ defer: false } as Partial<ConsentConfig>);

    assert.equal(page.scripts.length, 3);
  });
});

// One owner for the browser tags. With a GTM container saved, GTM loads GA4, the Meta pixel and the TikTok pixel as tags inside the
// container; the site loads only GTM itself and never starts gtag, fbq or ttq, so no event can be counted by two copies of a tag.
describe("consent script, GTM mode (a container is set)", () => {
  it("loads Google Tag Manager and nothing else, even with GA4, Meta and TikTok IDs saved", () => {
    const page = run(GTM_IDS);

    assert.deepEqual(page.scripts.map((src) => src.replace(/\?.*/, "")), ["https://www.googletagmanager.com/gtm.js"]);
    assert.ok(loaded(page.scripts, "gtm.js?id=GTM-TEST"));
    assert.ok(!loaded(page.scripts, "gtag/js") && !loaded(page.scripts, "fbevents.js") && !loaded(page.scripts, "analytics.tiktok.com"));
    assert.equal((page.dataLayer[1] as { event?: string }).event, "gtm.js");
  });

  it("starts no fbq or ttq, so a tag inside the container is the only one", () => {
    const sandbox = runDeferred(GTM_IDS).sandbox;

    assert.equal(sandbox.fbq, undefined);
    assert.equal(sandbox.ttq, undefined);
    assert.equal(sandbox.TiktokAnalyticsObject, undefined);
  });

  it("still tells GTM the visitor's choice first, and keeps telling it when the choice changes", () => {
    const page = run({ ...GTM_IDS, mode: "opt_in" });

    assert.equal(((page.dataLayer[0] as unknown[])[2] as Record<string, unknown>).ad_storage, "denied");
    page.consent.set(true, true);

    const update = page.layer().find((item) => item[0] === "consent" && item[1] === "update");
    assert.deepEqual(update?.[2], { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    assert.ok(!loaded(page.scripts, "fbevents.js") && !loaded(page.scripts, "analytics.tiktok.com") && !loaded(page.scripts, "gtag/js"), "allowing marketing loads no pixel from the site");

    // GTM is told in an event too, so a tag it held back for want of consent can fire now.
    const changed = page.layer().find((item) => (item as unknown as { event?: string }).event === "anaiza_consent_changed");
    assert.deepEqual({ ...(changed as unknown as object) }, { event: "anaiza_consent_changed", analytics_consent: "granted", marketing_consent: "granted" });
  });

  it("says nothing extra in direct mode, where there is no container to tell", () => {
    const page = run({ ...IDS, gtm: null, mode: "opt_in" });
    page.consent.set(true, true);

    assert.ok(!page.layer().some((item) => (item as unknown as { event?: string }).event === "anaiza_consent_changed"));
  });

  it("fetches only the container, late, on the first touch, and at once in the checkout and on the confirmation", () => {
    const late = runDeferred(GTM_IDS);
    assert.deepEqual(late.scripts, []);
    late.fire("pointerdown");
    assert.equal(late.scripts.length, 1);
    assert.ok(loaded(late.scripts, "gtm.js?id=GTM-TEST"));

    assert.equal(runDeferred(GTM_IDS, "/checkout").scripts.length, 1);
    assert.equal(runDeferred(GTM_IDS, "/order-confirmation").scripts.length, 1);
  });

  it("is what the settings choose: the page component hands over no pixel IDs when a container is saved", () => {
    const source = readFileSync(new URL("../components/MarketingScripts.tsx", import.meta.url), "utf8");

    assert.match(source, /const meta = !gtm \? marketing\?\.meta_pixel_id \|\| null : null;/);
    assert.match(source, /const tiktok = !gtm \? marketing\?\.tiktok_pixel_id \|\| null : null;/);
    assert.match(source, /const metaPixelId = !gtmId \? marketing\?\.meta_pixel_id \|\| null : null;/, "no Meta no-script image beside the container's own frame");
  });
});

describe("consent script, direct mode (no container)", () => {
  it("keeps loading GA4, the Meta pixel and the TikTok pixel itself", () => {
    const page = run({ ...IDS, gtm: null });

    assert.ok(loaded(page.scripts, "gtag/js?id=G-TESTGA4") && loaded(page.scripts, "fbevents.js") && loaded(page.scripts, "analytics.tiktok.com"));
    assert.ok(!loaded(page.scripts, "gtm.js"));
  });

  it("starts the Meta queue and the TikTok queue, and puts the pixel id in the page's config", () => {
    const sandbox = runDeferred({ ...IDS, gtm: null }).sandbox;

    assert.equal(typeof sandbox.fbq, "function");
    assert.ok(sandbox.ttq);
    assert.equal((sandbox.anaizaConsent as { config: { meta: string } }).config.meta, "1234567890");
  });
});
