import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { captureUtmParams, cleanUtmValue, clickIdsFromSearch, getStoredClickIds, getStoredUtmParams, utmFromRecord } from "./attribution.ts";

const store = new Map<string, string>();
const win = globalThis as unknown as { window?: Record<string, unknown> };

beforeEach(() => {
  store.clear();
  win.window = {
    localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key) },
    anaizaConsent: { effective: () => ({ a: true, m: true }) },
  };
});

/** What the shop keeps for an address that was landed on. */
function landed(search: string) {
  store.clear();
  captureUtmParams(search);

  return getStoredUtmParams();
}

describe("a UTM value is decoded once and is the same text however the link was written", () => {
  it("+ is a space and %XX is decoded once: all four ways of writing the same campaign give the same one", () => {
    const campaign = "AN | SALES | Broad";

    assert.equal(landed("?utm_campaign=AN+%7C+SALES+%7C+Broad").utm_campaign, campaign);
    assert.equal(landed("?utm_campaign=AN%20%7C%20SALES%20%7C%20Broad").utm_campaign, campaign);
    assert.equal(landed("?utm_campaign=AN | SALES | Broad").utm_campaign, campaign);
    assert.equal(landed("?utm_campaign=AN%20|%20SALES%20|%20Broad").utm_campaign, campaign);
  });

  it("the short examples from the audit", () => {
    assert.equal(landed("?utm_campaign=AN%20%7C%20SALES").utm_campaign, "AN | SALES");
    assert.equal(landed("?utm_campaign=AN | SALES").utm_campaign, "AN | SALES");
    assert.equal(landed("?utm_campaign=AN+|+SALES").utm_campaign, "AN | SALES");
  });

  it("a link that was encoded twice (%2B for each space) is the same campaign as one encoded once; it is not decoded a second time", () => {
    assert.equal(landed("?utm_campaign=AN%2B%7C%2BSALES%2B%7C%2BBroad").utm_campaign, "AN | SALES | Broad");
    // %2525 is the text "%25" after one decode: it stays "%25", it is not turned into "%"
    assert.equal(landed("?utm_campaign=sale%2525").utm_campaign, "sale%25");
  });

  it("a literal % does not break it, and nothing is decoded again", () => {
    assert.equal(landed("?utm_campaign=100%25%20off").utm_campaign, "100% off");
    assert.equal(landed("?utm_campaign=100%+off").utm_campaign, "100% off");
    assert.equal(landed("?utm_campaign=50%").utm_campaign, "50%");
    assert.equal(typeof landed("?utm_campaign=%E0%A4").utm_campaign, "string", "a broken byte sequence does not throw, and the visit is still recorded");
  });

  it("empty and blank values are not kept, and the others are trimmed with single spaces", () => {
    assert.deepEqual(landed("?utm_campaign="), {});
    assert.deepEqual(landed("?utm_campaign=%20%20%20"), {});
    assert.deepEqual(landed("?utm_campaign=+++"), {});
    assert.equal(landed("?utm_campaign=%20%20AN%20%20%20SALES%20").utm_campaign, "AN SALES");
    assert.equal(landed("?utm_source=&utm_medium=cpc").utm_medium, "cpc");
  });

  it("a real plus sign is left alone: one plus, a plus at the end, a value that already has spaces", () => {
    assert.equal(cleanUtmValue("Buy1+Get1"), "Buy1+Get1");
    assert.equal(cleanUtmValue("C++"), "C++");
    assert.equal(cleanUtmValue("Buy 1 + Get 1"), "Buy 1 + Get 1");
    assert.equal(cleanUtmValue("AN+|+SALES"), "AN | SALES");
    assert.equal(cleanUtmValue("tea+set+women"), "tea set women");
  });

  it("all five UTM fields are cleaned the same way", () => {
    const values = landed("?utm_source=face+book&utm_medium=paid%2Bsocial%2Bads&utm_campaign=AN+%7C+SALES&utm_content=video%20one&utm_term=tea%2Bset%2Bgift");

    assert.deepEqual(values, { utm_source: "face book", utm_medium: "paid social ads", utm_campaign: "AN | SALES", utm_content: "video one", utm_term: "tea set gift" });
  });

  it("a record kept by an earlier version, with the plus signs in it, is read as the clean campaign", () => {
    assert.deepEqual(utmFromRecord({ utm_campaign: "AN+|+SALES+|+Broad", capturedAt: Date.now() }, Date.now()), { utm_campaign: "AN | SALES | Broad" });
  });
});

describe("the ad click ids are kept as they are", () => {
  it("fbclid, gclid and ttclid are not changed", () => {
    store.clear();
    captureUtmParams("?fbclid=IwAR0abc_DEF-123&gclid=Cj0KCQ_x-y&ttclid=E.C.P.abc123");

    assert.deepEqual(getStoredClickIds(), { fbclid: "IwAR0abc_DEF-123", gclid: "Cj0KCQ_x-y", ttclid: "E.C.P.abc123" });
    assert.deepEqual(clickIdsFromSearch("?fbclid=IwAR0abc_DEF-123"), { fbclid: "IwAR0abc_DEF-123" });
  });

  it("a click id with a space or a symbol the shop does not accept is dropped, not changed into something else", () => {
    assert.deepEqual(clickIdsFromSearch("?fbclid=bad id"), {});
    assert.deepEqual(clickIdsFromSearch("?fbclid=a;b"), {});
  });
});
