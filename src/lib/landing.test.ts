import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { captureUtmParams, clickIdsFromSearch, getStoredClickIds, getStoredUtmParams } from "./attribution.ts";
import {
  dhakaTime,
  ENDED_TEXT,
  ENDED_TITLE,
  heroDestination,
  isLandingPath,
  landingSlugFromPath,
  LANDING_ANCHORS,
  previewTokenFromSearch,
  viewedKey,
} from "./landing.ts";
import { feedItemId, trackViewContentList, viewContentListPayload } from "./tracking.ts";
import type { Product } from "./types.ts";

const win = globalThis as unknown as { window?: Record<string, unknown> };

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function product(overrides: Partial<Product> & { id: number; name: string; effective_price: number }): Product {
  return { sku: null, variants: [], ...overrides } as unknown as Product;
}

describe("landing page paths", () => {
  it("recognises /lp and everything under it, and nothing else", () => {
    assert.equal(isLandingPath("/lp"), true);
    assert.equal(isLandingPath("/lp/eid-offer"), true);
    assert.equal(isLandingPath("/lp/eid-offer/"), true);
    assert.equal(isLandingPath("/lpx"), false);
    assert.equal(isLandingPath("/product/lp"), false);
    assert.equal(isLandingPath("/"), false);
    assert.equal(isLandingPath(null), false);
  });

  it("reads the slug from the real path (also in the fallback shell)", () => {
    assert.equal(landingSlugFromPath("/lp/eid-offer"), "eid-offer");
    assert.equal(landingSlugFromPath("/lp/eid-offer/"), "eid-offer");
    assert.equal(landingSlugFromPath("/lp/caf%C3%A9"), "café");
    assert.equal(landingSlugFromPath("/lp"), null);
    assert.equal(landingSlugFromPath("/pages/eid-offer"), null);
  });
});

describe("the preview link", () => {
  const token = `1790000000.${"a".repeat(64)}`;

  it("accepts only the shape the API issues", () => {
    assert.equal(previewTokenFromSearch(`?preview=${token}`), token);
    assert.equal(previewTokenFromSearch("?preview=abc"), null);
    assert.equal(previewTokenFromSearch("?preview=1790000000.zzzz"), null);
    assert.equal(previewTokenFromSearch(""), null);
  });
});

describe("the hero button", () => {
  it("goes to the products or the order form on the page", () => {
    assert.deepEqual(heroDestination("products", null), { kind: "anchor", id: LANDING_ANCHORS.products });
    assert.deepEqual(heroDestination("order", null), { kind: "anchor", id: LANDING_ANCHORS.order });
  });

  it("goes to an address only when it is one that is safe to open", () => {
    assert.deepEqual(heroDestination("url", "https://example.com/offer"), { kind: "url", href: "https://example.com/offer" });
    assert.deepEqual(heroDestination("url", "/shop"), { kind: "url", href: "/shop" });
    assert.equal(heroDestination("url", "javascript:alert(1)"), null);
    assert.equal(heroDestination("url", null), null);
  });
});

describe("small things", () => {
  it("counts a view once per page per session", () => {
    assert.equal(viewedKey(7), "anaiza-lp-viewed-7");
  });

  it("writes an end time in Dhaka time", () => {
    assert.equal(dhakaTime("2026-10-20T12:00:00Z"), "20 Oct 2026, 6:00 pm");
    assert.equal(dhakaTime(null), null);
    assert.equal(dhakaTime("nonsense"), null);
  });

  it("says plainly that an offer has ended, in the shop's voice", () => {
    assert.equal(ENDED_TITLE, "This offer has ended");
    assert.doesNotMatch(`${ENDED_TITLE} ${ENDED_TEXT}`, /!|hurry|missed|sorry/i);
  });
});

describe("ViewContent for the products on a page", () => {
  it("uses the feed ids: the SKU, else the product id, and a variant's own SKU", () => {
    const products = [
      product({ id: 1, name: "Glazed mug", effective_price: 600, sku: "MUG-1" }),
      product({ id: 2, name: "No SKU", effective_price: 900 }),
      product({ id: 3, name: "Tray", effective_price: 1500, sku: "TRAY", variants: [{ sku: "TRAY-BRASS" }] as never }),
    ];

    const payload = viewContentListPayload(products);

    assert.deepEqual(payload.content_ids, ["MUG-1", "2", "TRAY-BRASS"]);
    assert.equal(payload.content_type, "product");
    assert.equal(payload.currency, "BDT");
    assert.equal(payload.value, 600);
    assert.deepEqual(payload.contents[2], { id: "TRAY-BRASS", quantity: 1, item_price: 1500 });
    assert.equal(feedItemId({ id: 2, sku: null }), "2");
  });

  it("goes to the data layer, Meta and TikTok with those ids", () => {
    const fbq: unknown[][] = [];
    const ttq: unknown[][] = [];
    win.window = {
      dataLayer: [],
      fbq: (...args: unknown[]) => fbq.push(args),
      ttq: { track: (...args: unknown[]) => ttq.push(args), page: () => undefined },
    };

    trackViewContentList([product({ id: 1, name: "Glazed mug", effective_price: 600, sku: "MUG-1" })], "Landing page: eid-offer");

    const layer = (win.window?.dataLayer as Record<string, unknown>[]).filter((entry) => entry.event);
    assert.equal(layer[0].event, "view_item_list");
    assert.deepEqual((layer[0].ecommerce as { items: { item_id: string }[] }).items.map((item) => item.item_id), ["MUG-1"]);
    assert.equal(fbq[0][0], "track");
    assert.equal(fbq[0][1], "ViewContent");
    assert.deepEqual((fbq[0][2] as { content_ids: string[] }).content_ids, ["MUG-1"]);
    assert.equal(ttq[0][0], "ViewContent");
    assert.deepEqual((ttq[0][1] as { contents: { content_id: string }[] }).contents[0].content_id, "MUG-1");
  });

  it("sends nothing for a page with no products", () => {
    win.window = { dataLayer: [], fbq: () => assert.fail("no event expected") };

    trackViewContentList([], "Landing page: empty");

    assert.deepEqual(win.window.dataLayer, []);
  });
});

describe("ad click ids", () => {
  beforeEach(() => {
    win.window = { localStorage: new MemoryStorage() };
  });

  it("reads fbclid, gclid and ttclid from the address, and nothing malformed", () => {
    assert.deepEqual(clickIdsFromSearch("?utm_source=fb&fbclid=IwAR-abc_123&gclid=Cj0.KCQ&ttclid=E.C.P.xyz"), {
      fbclid: "IwAR-abc_123",
      gclid: "Cj0.KCQ",
      ttclid: "E.C.P.xyz",
    });
    assert.deepEqual(clickIdsFromSearch("?fbclid=<script>alert(1)</script>"), {});
    assert.deepEqual(clickIdsFromSearch(`?gclid=${"a".repeat(300)}`), {});
    assert.deepEqual(clickIdsFromSearch("?x=1"), {});
  });

  it("keeps them next to the UTM parameters, until they are old", () => {
    captureUtmParams("?utm_source=meta&utm_campaign=eid&fbclid=IwAR-abc");

    assert.deepEqual(getStoredClickIds(), { fbclid: "IwAR-abc" });
    assert.deepEqual(getStoredUtmParams(), { utm_source: "meta", utm_campaign: "eid" });

    const storage = win.window?.localStorage as MemoryStorage;
    const record = JSON.parse(storage.getItem("anaiza-click-ids") as string);
    storage.setItem("anaiza-click-ids", JSON.stringify({ ...record, capturedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }));

    assert.deepEqual(getStoredClickIds(), {}, "30 days, like the UTM parameters");
  });

  it("is not stored while the visitor has not allowed marketing", () => {
    win.window = {
      localStorage: new MemoryStorage(),
      anaizaConsent: { optIn: true, effective: () => ({ a: false, m: false }) },
    };

    captureUtmParams("?fbclid=IwAR-abc&utm_source=meta");

    assert.deepEqual(getStoredClickIds(), {});
    assert.deepEqual(getStoredUtmParams(), {});
  });
});
