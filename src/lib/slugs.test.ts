import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movedTo, oldSlugs, pathFor, pathOf, safePath, tileHref } from "./slugs.ts";

describe("paths on the shop", () => {
  it("are the API's path when it is a clean path of the right kind, else built from the slug", () => {
    assert.equal(pathOf("category", { slug: "eid-gifts", path: "/category/eid-gifts" }), "/category/eid-gifts");
    assert.equal(pathOf("category", { slug: "eid-gifts" }), "/category/eid-gifts");
    assert.equal(pathOf("page", { slug: "about", path: "/pages/about" }), "/pages/about");
    assert.equal(pathOf("landing_page", { slug: "eid-offer", path: "/lp/eid-offer" }), "/lp/eid-offer");
    // A path of the wrong kind, an address that leaves the site, or junk is not trusted.
    assert.equal(pathOf("category", { slug: "tea", path: "/pages/tea" }), "/category/tea");
    assert.equal(pathOf("category", { slug: "tea", path: "//evil.example/x" }), "/category/tea");
    assert.equal(pathOf("category", { slug: "tea", path: "https://evil.example/category/tea" }), "/category/tea");
    assert.equal(pathFor("category", "a b"), "/category/a%20b");
  });

  it("safePath refuses what could leave the site", () => {
    for (const value of ["//evil.example", "https://x.example", "javascript:alert(1)", "/a b", "/a\\b", "", null, 5, undefined]) assert.equal(safePath(value), null, String(value));
    assert.equal(safePath("/category/x?y=1"), "/category/x?y=1");
  });
});

describe("an address that has changed", () => {
  it("follows the API's redirect hint", () => {
    const record = { slug: "eid-gifts", path: "/category/eid-gifts", redirect: { to: "/category/eid-gifts" } };

    assert.equal(movedTo("category", "eid", record), "/category/eid-gifts");
  });

  it("with no hint, a slug that is not the page's own means it has moved", () => {
    assert.equal(movedTo("landing_page", "old-offer", { slug: "eid-offer", path: "/lp/eid-offer" }), "/lp/eid-offer");
  });

  it("the current address does not move", () => {
    assert.equal(movedTo("category", "eid-gifts", { slug: "eid-gifts", path: "/category/eid-gifts", redirect: null }), null);
    assert.equal(movedTo("page", "about", { slug: "about" }), null);
  });

  it("never follows a hint that leaves the site", () => {
    assert.equal(movedTo("category", "eid", { slug: "eid", redirect: { to: "https://evil.example/" } }), null);
    assert.equal(movedTo("category", "eid", { slug: "eid", redirect: { to: "//evil.example/" } }), null);
  });
});

describe("old addresses from the sitemap", () => {
  const redirects = [
    { type: "category", from: "/category/eid", to: "/category/eid-gifts" },
    { type: "category", from: "/category/old%20one", to: "/category/new-one" },
    { type: "page", from: "/pages/delivery", to: "/pages/shipping" },
    { type: "landing_page", from: "/lp/old-offer", to: "/lp/eid-offer" },
    { type: "category", from: "/category/a/b", to: "/category/c" },
    { type: "category", from: "https://evil.example/category/x", to: "/category/c" },
  ];

  it("lists the old slugs of each kind, once, and nothing else", () => {
    assert.deepEqual(oldSlugs("category", redirects), ["eid", "old one"]);
    assert.deepEqual(oldSlugs("page", redirects), ["delivery"]);
    assert.deepEqual(oldSlugs("landing_page", redirects), ["old-offer"]);
    assert.deepEqual(oldSlugs("product", redirects), []);
    assert.deepEqual(oldSlugs("category", []), []);
  });
});

describe("a Shop by occasion tile", () => {
  it("uses the API's path, then its href", () => {
    assert.equal(tileHref({ href: "/category/old", path: "/category/new" }), "/category/new");
    assert.equal(tileHref({ href: "/category/tea-sets" }), "/category/tea-sets");
    assert.equal(tileHref({ href: "https://example.com/eid", path: null }), "https://example.com/eid");
    assert.equal(tileHref({ href: "/shop", path: "//evil.example" }), "/shop");
  });
});
