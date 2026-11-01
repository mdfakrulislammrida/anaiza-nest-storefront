import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SHARE_IMAGE_PATH, defaultShareImage, httpsAddress, pickShareImage, shareMetadata } from "./shareImage.ts";

const SITE = "https://anaizanest.com";

describe("share image addresses", () => {
  it("are always full https addresses", () => {
    assert.equal(httpsAddress("https://api.anaizanest.com/storage/a.png", SITE), "https://api.anaizanest.com/storage/a.png");
    assert.equal(httpsAddress("http://cdn.example.com/a.jpg", SITE), "https://cdn.example.com/a.jpg");
    assert.equal(httpsAddress("//cdn.example.com/a.jpg", SITE), "https://cdn.example.com/a.jpg");
    assert.equal(httpsAddress("/brand/share-default.png", SITE), "https://anaizanest.com/brand/share-default.png");
    assert.equal(httpsAddress("  https://x.example/a.png  ", SITE), "https://x.example/a.png");
  });

  it("lets a machine's own address stay http so the dev server works, and nothing else", () => {
    assert.equal(httpsAddress("http://localhost:8787/storage/a.png", SITE), "http://localhost:8787/storage/a.png");
    assert.equal(httpsAddress("http://127.0.0.1:8787/storage/a.png", SITE), "http://127.0.0.1:8787/storage/a.png");
    assert.equal(httpsAddress("http://shop.test/a.png", SITE), "http://shop.test/a.png");
  });

  it("is null for nothing, nonsense, or an address that is not a web address", () => {
    for (const value of [null, undefined, "", "   ", "javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://x.example/a.png", "not a url"]) {
      assert.equal(httpsAddress(value, SITE), null, String(value));
    }
  });
});

describe("which picture a page gets", () => {
  const fallback = defaultShareImage(null, SITE);

  it("the default is the admin's upload when there is one, else the committed brand picture", () => {
    assert.equal(defaultShareImage("https://api.anaizanest.com/storage/site/share.png", SITE), "https://api.anaizanest.com/storage/site/share.png");
    assert.equal(defaultShareImage(null, SITE), `${SITE}${DEFAULT_SHARE_IMAGE_PATH}`);
    assert.equal(defaultShareImage("", SITE), `${SITE}${DEFAULT_SHARE_IMAGE_PATH}`);
  });

  it("takes the first usable picture in order: the API's, the older key, the page's own", () => {
    assert.equal(pickShareImage(["https://a.example/seo.png", "https://a.example/og.png", "https://a.example/main.png"], fallback, SITE), "https://a.example/seo.png");
    assert.equal(pickShareImage([null, "https://a.example/og.png", "https://a.example/main.png"], fallback, SITE), "https://a.example/og.png");
    assert.equal(pickShareImage([null, "", "http://a.example/main.png"], fallback, SITE), "https://a.example/main.png");
  });

  it("falls back to the default when the page has none, and never to nothing", () => {
    assert.equal(pickShareImage([null, undefined, "", "javascript:x"], fallback, SITE), fallback);
    assert.equal(pickShareImage([], fallback, SITE), fallback);
    assert.match(fallback, /^https:\/\//);
  });
});

describe("the openGraph and twitter parts", () => {
  it("carry the same picture, the page's own address, and a large card", () => {
    const meta = shareMetadata({ title: "Tea sets", description: "Gift tea sets.", url: "/category/tea-sets", image: "https://a.example/tea.png" });

    assert.deepEqual(meta.openGraph.images, [{ url: "https://a.example/tea.png" }]);
    assert.deepEqual(meta.twitter.images, ["https://a.example/tea.png"]);
    assert.equal(meta.twitter.card, "summary_large_image");
    assert.equal(meta.openGraph.url, "/category/tea-sets");
    assert.equal(meta.openGraph.type, "website");
  });

  it("gives the default picture its size, and a page's own picture none (it is not known)", () => {
    const own = shareMetadata({ title: "x", url: "/x", image: "https://a.example/own.png" });
    const standard = shareMetadata({ title: "x", url: "/x", image: `${SITE}${DEFAULT_SHARE_IMAGE_PATH}` });

    assert.deepEqual(own.openGraph.images, [{ url: "https://a.example/own.png" }]);
    assert.deepEqual(standard.openGraph.images, [{ url: `${SITE}${DEFAULT_SHARE_IMAGE_PATH}`, width: 1200, height: 630 }]);
  });

  it("an article has its published time", () => {
    const meta = shareMetadata({ title: "x", url: "/blog/x", type: "article", publishedTime: "2026-10-01T00:00:00Z", image: "https://a.example/a.png" });

    assert.equal(meta.openGraph.type, "article");
    assert.equal(meta.openGraph.publishedTime, "2026-10-01T00:00:00Z");
  });
});
