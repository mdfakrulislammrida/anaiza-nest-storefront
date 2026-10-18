# Product pages and search engines

A product page reaches a visitor in one of two ways. What a crawler reads without running JavaScript differs between them.

## 1. A product that existed at the last build: a real HTML file

`/product/<slug>` is `out/product/<slug>.html`, made by `npm run build` from the API. The HTML carries, with no JavaScript:

| Item | Source |
| --- | --- |
| `<title>` | the product's SEO title, else its name |
| `meta description` and `og:description` | the SEO description, else the short description, else the summary, else the first words of the description (cut at a word, 155 characters at most). See `metaDescription()` in `src/lib/productDisplay.ts` |
| `og:title`, `og:url`, `og:type`, `canonical`, `twitter:card` | the title and the product's address |
| `og:image` and `twitter:image` | the SEO image, else the first product photo. A product with no photo has none: nothing is made up |
| JSON-LD `Product` | name, sku, image (all photos), price in BDT, availability, brand, description (short description, else summary), reviews when there are any |
| JSON-LD `BreadcrumbList`, `FAQPage` | the category trail, and the product's questions when it has some |
| JSON-LD `Organization` and `WebSite` | once, from the root layout (not repeated per page) |
| the `h1`, price, stock, description, specifications, reviews, related products | in the page body |

The page is built from the product as it was at the build. A price, stock or text change made afterwards is picked up in the browser a moment after the page opens (the page refreshes itself from the API), but a crawler that does not run JavaScript keeps seeing the built values until the next build.

## 2. A product created after the last build: the client-only shell

There is no file for it, so `public/.htaccess` serves `/product.html` for any `/product/<slug>` that has no file. That page is one shell for every product. It reads the slug from the address and fetches the product from the API in the browser.

What a crawler that does not run JavaScript sees in the shell's HTML:

- the site's own title and description (the root layout's), not the product's;
- `og:title` and `og:description` of the site, no `og:image`, no `og:url`, no `canonical`;
- one `Organization` and one `WebSite` JSON-LD node, and **no** `Product`, `BreadcrumbList` or `FAQPage`;
- no `h1` and none of the product's words: the body says "One moment, finding that piece" until the script has run.

A crawler that runs JavaScript (Googlebot does) sees the finished page, and the shell sets the browser tab's title from the product. It does not add the JSON-LD, the product description or the Open Graph tags to the head.

This is the cost of a static site with no server (see the comment in `public/.htaccess`): a page can only carry a product's tags if it was written when the product was known. **There is no workaround in the code, and none should be invented in it.** What to do:

- **Rebuild and upload after adding products.** Every product in the API at build time gets the full page of section 1.
- A product added in the admin works for customers at once (the shell), but should be treated as not yet fully visible to search and to link previews (WhatsApp, Facebook) until the next build.
- Link previews read only the HTML: a shell link shows the shop's name and description, not the product's. After a rebuild the product's own title, description and photo appear.

Settings > System health does not report this; the admin's product list does not show which products have a built page. Compare `out/product/` after a build with the product list if it matters.

## Checking it

After a build, `node scripts/audit-html.cjs out/product/<slug>.html out/product.html` prints what a crawler reads without JavaScript: the title, `meta description`, the `og:*` tags, the canonical address, the JSON-LD blocks and their types. Run it after any change to `generateMetadata` in `src/app/product/[slug]/page.tsx` or to `src/lib/jsonld.ts`.
