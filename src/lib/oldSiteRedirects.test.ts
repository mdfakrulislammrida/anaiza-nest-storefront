import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { OLD_SITE_URLS } from "./oldSiteUrls.ts";
import { parseRules, resolve, type Environment, type Outcome } from "./rewriteRules.ts";

// The real public/.htaccess, run through a small interpreter of its rules (src/lib/rewriteRules.ts) against a pretend build.
const rules = parseRules(readFileSync(new URL("../../public/.htaccess", import.meta.url), "utf8"));

const files = new Set([
  "index.html", "404.html", "shop.html", "faq.html", "contact.html", "account.html", "checkout.html", "track-order.html", "special-prices.html",
  "hot-deals.html", "blog.html", "product.html", "pages.html", "category.html", "article.html", "lp.html",
  "category/gifts.html", "category/tea-sets.html", "category/tea-jars.html", "category/cups-and-mugs.html",
  "pages/about.html", "pages/shipping.html", "pages/returns.html", "pages/terms.html", "pages/privacy.html",
  "product/tea-coaster-set-of-6-with-holder.html", "product/morris-ceramic-coffee-cup-and-saucer-set.html", "product/lotus-ceramic-tea-jar-with-wooden-lid.html",
  "_next/static/app.js", "sitemap.xml", "robots.txt",
]);

const env: Environment = { files, https: true, host: "anaizanest.com" };
const at = (address: string, over: Partial<Environment> = {}): Outcome => resolve(rules, address, { ...env, ...over });
const to = (location: string): Outcome => ({ kind: "redirect", status: 301, location });

describe("every address in the old site's sitemap", () => {
  const expected: Record<string, Outcome> = {
    "/": { kind: "none" }, // the home page, answered by the directory index
    "/category/car-accessories": to("/shop"),
    "/subcategory/car-dash-camera": to("/shop"),
    "/subcategory/car-jump-starter": to("/shop"),
    "/subcategory/car-tire-inflator": to("/shop"),
    "/subcategory/car-vacuum-cleaner": to("/shop"),
    "/category/music-accessories": to("/shop"),
    "/subcategory/tws": to("/shop"),
    "/subcategory/bluetooth-neckband-earphone": to("/shop"),
    "/subcategory/bluetooth-speaker": to("/shop"),
    "/category/mobile-accessories": to("/shop"),
    "/subcategory/charging-cable": to("/shop"),
    "/subcategory/charger-adapter": to("/shop"),
    "/subcategory/screen-protector": to("/shop"),
    "/category/gifts": { kind: "file", path: "category/gifts.html" },
    "/category/electronic-gadgets": to("/shop"),
    "/category/watches": to("/shop"),
    "/category/pc-accessories": to("/shop"),
    "/category/laptop-&-computer": to("/shop"),
    "/category/baby-items": to("/shop"),
    "/category/lifestyle": to("/shop"),
    "/category/lifestyle?sold=show": to("/shop"),
    "/customer/order-track": to("/track-order"),
    "/customer/checkout": to("/checkout"),
    "/hot-deals": to("/special-prices"),
    "/site/contact-us": to("/contact"),
    "/customer/login": to("/account"),
    "/customer/register": to("/account?mode=register"),
    "/customer/forgot-password": to("/account?mode=forgot"),
    "/page/order-procedure": to("/faq"),
    "/page/delivery-rules": to("/pages/shipping"),
    "/page/return-policy": to("/pages/returns"),
    "/page/terms-&-conditions": to("/pages/terms"),
    "/page/privacy-policy": to("/pages/privacy"),
    "/page/test": to("/"),
    "/product/premium-ceramic-tea-cup-set-with-gift%7C-floral-design-%7C-2-pieces-195": to("/category/cups-and-mugs"),
    "/product/premium-ceramic-tea-cup-set-with-gift|-floral-design-|-2-pieces-195": to("/category/cups-and-mugs"),
    "/product/luxury-ceramic-tea-set-with-premium-wooden-gift-box-202": to("/category/tea-sets"),
    "/product/premium-wireless-bluetooth-earbuds-with-charging-case-201": to("/shop"),
    "/product/adjustable-foldable-mobile-phone-stand-%E2%80%93-anti-slip-desktop-holder-201": to("/shop"),
    "/product/smart-desktop-clock-&-speaker-205": to("/shop"),
    "/product/premium-blue-floral-ceramic-tea-set-with-luxury-carry-case-202": to("/category/tea-sets"),
    "/product/business-executive-gift-set--2-207": to("/category/gifts"),
    "/product/premium-black-walnut-tea-coaster-set-with-holder-206": to("/product/tea-coaster-set-of-6-with-holder"),
    "/product/stunning-as-premium-tableware-or-creative-wall-decor-205": to("/shop"),
    "/product/ceramic-floral-bowl-set-204": to("/shop"),
    "/product/business-executive-gift-set-1-203": to("/category/gifts"),
    "/product/elegant-floral-tea-set-gift-box-200": to("/category/tea-sets"),
    "/product/candle-box-199": to("/shop"),
    "/product/ceramic-tea-cup-set-with-gift-packaging-196": to("/category/cups-and-mugs"),
    "/product/luxury-style-coffee-cup-and-saucer-set-194": to("/product/morris-ceramic-coffee-cup-and-saucer-set"),
    "/product/portable-bluetooth-speaker-with-rgb-light-205": to("/shop"),
    "/product/newborn-baby-rattle-gift-set-197": to("/category/gifts"),
  };

  it("has an answer in this test for each address in the list", () => {
    const covered = new Set(Object.keys(expected));
    for (const url of OLD_SITE_URLS) assert.ok(covered.has(url), `${url} is in the expected table`);
  });

  for (const [url, outcome] of Object.entries(expected)) {
    it(`${url} -> ${outcome.kind === "redirect" ? `${outcome.status} ${outcome.location}` : outcome.kind}`, () => {
      assert.deepEqual(at(url), outcome);
    });
  }

  it("never ends on a 404 for a product, a category or a page, and never sends a product to the home page", () => {
    for (const url of OLD_SITE_URLS.filter((u) => /^\/(product|category|subcategory|page|customer|site)\//.test(u))) {
      const outcome = at(url);
      assert.ok(outcome.kind === "redirect" || outcome.kind === "file", `${url} is answered`);
      if (outcome.kind === "redirect") {
        assert.equal(outcome.status, 301);
        const page = outcome.location.replace(/^\//, "").split("?")[0];
        assert.ok(files.has(page === "" ? "index.html" : `${page}.html`), `${outcome.location} is a page in the build`);
        if (url.startsWith("/product/")) assert.notEqual(outcome.location, "/", `${url} does not go to the home page`);
      }
    }
  });

  it("drops the old query string, but keeps the one a redirect asks for", () => {
    assert.deepEqual(at("/category/lifestyle?sold=show"), to("/shop"));
    assert.deepEqual(at("/customer/register?utm=x"), to("/account?mode=register"));
    assert.deepEqual(at("/hot-deals?sort=price"), to("/special-prices?sort=price"), "hot-deals keeps its query, as it always did");
  });

  it("also answers the same addresses with a trailing slash, and the rest of an old area", () => {
    assert.deepEqual(at("/page/return-policy/"), to("/pages/returns"));
    assert.deepEqual(at("/customer/forgot-password/"), to("/account?mode=forgot"));
    assert.deepEqual(at("/subcategory/some-other-one"), to("/shop"));
    assert.deepEqual(at("/page/anything-else"), to("/shop"));
    assert.deepEqual(at("/customer/orders"), to("/account"));
  });
});

describe("the new shop's own addresses are not disturbed", () => {
  it("serves a product, category or page that is in the build", () => {
    assert.deepEqual(at("/product/lotus-ceramic-tea-jar-with-wooden-lid"), { kind: "file", path: "product/lotus-ceramic-tea-jar-with-wooden-lid.html" });
    assert.deepEqual(at("/category/gifts"), { kind: "file", path: "category/gifts.html" });
    assert.deepEqual(at("/pages/about"), { kind: "file", path: "pages/about.html" });
    assert.deepEqual(at("/shop"), { kind: "file", path: "shop.html" });
    assert.deepEqual(at("/shop/"), { kind: "file", path: "shop.html" });
  });

  it("sends an item added after the build to its client shell, as before", () => {
    assert.deepEqual(at("/product/a-brand-new-tea-set"), { kind: "file", path: "product.html" });
    assert.deepEqual(at("/category/new-category"), { kind: "file", path: "category.html" });
    assert.deepEqual(at("/pages/new-page"), { kind: "file", path: "pages.html" });
    assert.deepEqual(at("/blog/new-post"), { kind: "file", path: "article.html" });
    assert.deepEqual(at("/lp/spring-offer"), { kind: "file", path: "lp.html" });
  });

  it("leaves built files alone", () => {
    assert.deepEqual(at("/_next/static/app.js"), { kind: "file", path: "_next/static/app.js" });
    assert.deepEqual(at("/sitemap.xml"), { kind: "file", path: "sitemap.xml" });
  });

  it("does not touch /api, /storage or /admin, which belong to the API's folder", () => {
    for (const address of ["/api/products", "/api", "/api/", "/storage/products/a.jpg", "/admin", "/admin/orders/1/edit", "/api/product/anything-195"]) {
      assert.deepEqual(at(address), { kind: "untouched" }, address);
      assert.deepEqual(at(address, { https: false, forwardedProto: "http" }), { kind: "untouched" }, `${address} even over http`);
    }
  });

  it("redirects http to https once, and www to the bare domain, keeping the path", () => {
    assert.deepEqual(at("/shop?sort=price", { https: false }), to("https://anaizanest.com/shop?sort=price"));
    assert.deepEqual(at("/shop", { https: true, host: "www.anaizanest.com" }), to("https://anaizanest.com/shop"));
    assert.deepEqual(at("/shop", { https: false, forwardedProto: "https" }), { kind: "file", path: "shop.html" }, "a host that ends https in front is not redirected again");
  });
});

describe("the staging host's own .htaccess", () => {
  const staging = parseRules(readFileSync(new URL("../../deploy/new-subdomain/.htaccess", import.meta.url), "utf8"));
  const onStaging = (address: string): Outcome => resolve(staging, address, { files: new Set(), https: true, host: "new.anaizanest.com" });

  it("sends every path to the same path on the main domain with a 301, query included", () => {
    assert.deepEqual(onStaging("/"), to("https://anaizanest.com/"));
    assert.deepEqual(onStaging("/product/lotus-ceramic-tea-jar-with-wooden-lid"), to("https://anaizanest.com/product/lotus-ceramic-tea-jar-with-wooden-lid"));
    assert.deepEqual(onStaging("/shop?sort=price&page=2"), to("https://anaizanest.com/shop?sort=price&page=2"));
    assert.deepEqual(onStaging("/_next/static/app.js"), to("https://anaizanest.com/_next/static/app.js"));
    assert.deepEqual(onStaging("/robots.txt"), to("https://anaizanest.com/robots.txt"));
  });
});
