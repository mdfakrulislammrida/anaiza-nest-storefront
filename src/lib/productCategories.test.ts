// Run with `npm test` (Node's built-in test runner; no extra dependency).
//
// A product can be listed in several categories (the API's `categories`: the primary first). The shop shows what the API says: a category page, its
// count and "related" all come from /products?category=<slug>, which lists a product once in each category it is in. These tests keep it that way, and
// keep the PRIMARY category (`category`) as the one the breadcrumb, the structured data and the tracking use.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { withCheckedPrices } from "./pricing.ts";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

function files(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = `${dir}${name}`;
    if (statSync(path).isDirectory()) files(`${path}/`, found);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) found.push(path);
  }

  return found;
}

const app = files(SRC);

// A product as the API sends it (the parts these tests read).
const primary = { id: 1, slug: "tea-sets", name: "Tea sets" };
const gifts = { id: 2, slug: "gifts", name: "Gifts" };
const ceramic = { id: 3, slug: "ceramic", name: "Ceramic" };
const base = { id: 7, slug: "peacock-set", name: "Peacock Ceramic Tea Set", price: 4200, sale_price: null, effective_price: 4200, discount_percent: null, category: primary };
const refs = [
  { ...primary, is_primary: true },
  { ...gifts, is_primary: false },
  { ...ceramic, is_primary: false },
];

describe("a product with three categories, and an API without the new field", () => {
  it("keeps `category` (the primary) and `categories` exactly as the API sent them", () => {
    const product = withCheckedPrices({ ...base, categories: refs });

    assert.deepEqual(product.category, primary);
    assert.deepEqual(product.categories, refs);
    assert.equal(product.categories.filter((c) => c.is_primary).length, 1);
    assert.equal(product.categories[0].slug, product.category.slug, "the primary is first");
    assert.equal(new Set(product.categories.map((c) => c.id)).size, 3, "each category once");
  });

  it("works the same for an older API that has no `categories`: the product is in `category` only", () => {
    const old = withCheckedPrices({ ...base });

    assert.equal("categories" in old, false);
    assert.deepEqual(old.category, primary);
  });

  it("declares `categories` as optional in the type", () => {
    const types = source("./types.ts");

    assert.match(types, /categories\?: ProductCategoryRef\[\]/);
    assert.match(types, /interface ProductCategoryRef \{[^}]*is_primary: boolean/);
    assert.match(types, /\n  category: CategorySummary;/, "`category` stays required: the primary");
  });
});

describe("category lists, counts and related products come from the API", () => {
  it("never decide in the browser which products belong to a category", () => {
    for (const path of app) {
      const text = readFileSync(path, "utf8");
      // e.g. products.filter((p) => p.category.slug === slug): that would drop every product that is only listed there as an extra.
      assert.doesNotMatch(text, /categor[a-z]*(\?)?\.(slug|id)\s*(===|!==|==|!=)/, `${path}: compares a category's slug or id`);
      assert.doesNotMatch(text, /\.filter\([^\n]*\bcategories?\b[^\n]*\bproduct/i, `${path}: filters products by category in the browser`);
    }
  });

  it("asks the API for a category's products with ?category=<slug>", () => {
    const api = source("./api.ts");

    assert.match(api, /if \(params\.category\) query\.set\("category", params\.category\);/);
    // The list is what the API answered, with only the prices re-checked: nothing is dropped or added.
    assert.match(api, /return \{ \.\.\.result, data: result\.data\.map\(withCheckedPrices\) \};/);
  });

  it("builds every category page's list from that call (static pages, the flat page, the page's own listing)", () => {
    assert.match(source("../app/category/[slug]/page.tsx"), /getProducts\(\{ category: category\.slug, page: 1, per_page: 24 \}\)/);
    assert.match(source("../app/category/page.tsx"), /getProducts\(\{ category: fetched\.slug, page: 1, per_page: 24 \}\)/);
    assert.match(source("../components/CategoryDetail.tsx"), /fixedParams=\{\{ category: category\.slug \}\}/);
  });

  it("shows the count the API gives for the list, not a count of what is on screen", () => {
    for (const path of ["../components/ProductListing.tsx", "../components/ProductListingFallback.tsx"]) {
      const text = source(path);

      assert.match(text, /countOf\((meta\?\.total \?\? 0|result\.meta\.total), "product"\)/, path);
      assert.doesNotMatch(text, /countOf\(products\.length/, path);
    }
  });

  it("finds related products in the PRIMARY category, from the same call", () => {
    for (const path of ["../app/product/[slug]/page.tsx", "../app/product/page.tsx", "../components/ProductDetailClient.tsx"]) {
      assert.match(source(path), /getProducts\(\{ category: (product|fresh|fetched)\.category\.slug, per_page: 5 \}\)/, path);
    }
  });
});

describe("the primary category is what the breadcrumb, the structured data and the tracking use", () => {
  it("builds the product page's breadcrumb (and its JSON-LD) from `category`", () => {
    const page = source("../app/product/[slug]/page.tsx");

    assert.match(page, /\{ name: product\.category\.name, path: pathOf\("category", product\.category\) \}/);
    assert.match(source("../components/ProductDetail.tsx"), /href=\{pathOf\("category", product\.category\)\}/);
    assert.match(source("../components/ProductDetail.tsx"), /\{product\.category\.name\}/);
  });

  it("does not read `categories` anywhere in the shop's code: no new links, chips or labels", () => {
    for (const path of app) {
      if (path.endsWith("/types.ts")) continue;

      assert.doesNotMatch(readFileSync(path, "utf8"), /\.categories\b(?!\s*=)(?![^\n]*menu)/, `${path}: reads a product's categories`);
    }
  });

  it("sends the primary category to the data layer (item_category) from a product and from the cart", () => {
    const tracking = source("./tracking.ts");

    assert.match(tracking, /product\.effective_price \?\? product\.price \?\? 0, quantity, product\.category\?\.name\)/);
    assert.match(source("../context/CartContext.tsx"), /\.\.\.\(product\.category\?\.name \? \{ category: product\.category\.name \} : \{\}\)/);
    assert.doesNotMatch(tracking, /categories/);
  });

  it("gives a product one address and no address per category: the sitemap lists each product once, from the product list", () => {
    const sitemap = source("../app/sitemap.ts");

    assert.match(sitemap, /categories\.map\(\(category\) => \(\{/, "category pages, from the category list");
    assert.doesNotMatch(sitemap, /\.categories\b/, "nothing is built from a product's categories");
    assert.doesNotMatch(sitemap, /category\.slug.*product|product.*category\.slug/, "no product address under a category");
  });

  it("makes no product or canonical address from a category", () => {
    const slugs = source("./slugs.ts");

    assert.match(slugs, /product: "\/product\/"/);
    assert.doesNotMatch(slugs, /\/category\/.*\/product/);
  });
});
