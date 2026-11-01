# Favicon, share image, changed addresses, invoice download, order status words (Batch OPS1)

The storefront is a static export: every `<link>` and `<meta>` tag below is written into the HTML at build time. A change made in the admin shows
on the website **after the site is rebuilt and uploaded**, except where a section says it refreshes by itself.

## 1. Browser icons

* Source: Site settings > Brand > **Monogram** in the admin. The API returns it as a full https address (`monogram`, and `brand.monogram` with its size).
* `scripts/generate-icons.ts` runs before every `npm run build` (the `prebuild` script). It downloads the Monogram and writes
  `src/app/favicon.ico` (16, 32, 48 px), `src/app/icon.png` (512 px) and `src/app/apple-icon.png` (180 px). It only resizes: the mark is never
  redrawn or recoloured. There is no web manifest, so no 192 px icon.
* The three files are committed. If the API cannot be reached, there is no Monogram, or it is under 180 px, the script says so and the build goes on
  with the committed files. The default Next.js icon is gone and cannot come back.
* Next puts the `<link rel="icon">` and `<link rel="apple-touch-icon">` tags into every page, each address carrying a version that changes with the
  file, so a browser that cached the old icon asks again.
* To see a new Monogram: upload it, then rebuild and upload the site (`node --no-warnings scripts/generate-icons.ts --force` makes the files by hand).
* Why the tab showed the Next.js icon: the old build wrote two icon links, and the first (`/favicon.ico`, the template's default file, marked 256x256) is the
  one browsers pick. The Monogram link came second with no size. Now there is one set of links, made from the Monogram.
* At 16 px the "AN" blurs into a light smudge on navy; at 32 px and up it is clear. It was not changed. A tab-size version (letters larger in the
  square, no gold line) would read better; it needs a second upload slot or a new Monogram.

## 2. Share image

* Every page's `og:image` and `twitter:image` is a full https address, chosen in this order (`src/lib/shareImage.ts`): the API's `seo.image`, the older
  `og_image`, the picture the page shows, then the **default share image**.
* Default share image: Site settings > Brand > Default share image when uploaded (`default_share_image`), otherwise the committed brand picture
  `public/brand/share-default.png` (1200 by 630: ivory, the navy logo, a thin gold rule, "Gifted, beautifully."). `node scripts/make-share-image.cjs`
  makes it again (needs Chrome).
* `scripts/meta-table.cjs` prints, for each kind of page in the built HTML, the title, og tags, twitter card, canonical, robots, icons and JSON-LD.
  `--check` fails when a page lacks the icons or an absolute https share image, or when a private page is not noindex.
* Pages for products, categories, pages, articles and landing pages are made at build time, one per address, so each has its own tags in the HTML.
  A product, category or page created after the last build is answered by a shell page (see 3) with the default tags until the next build.
  Social scrapers do not run scripts, so a link to such an item previews with the default share image and the site title.

## 3. Changed addresses (slugs)

* The API is the source of truth: a category, page or landing page carries `slug`, `path` and `previous_slugs`. A request on an old slug answers with a
  `redirect` hint. `src/lib/slugs.ts` reads these; menus, the sitemap, `llms.txt`, breadcrumbs, canonicals, JSON-LD and "Shop by occasion" tiles use `path`.
* At build time an old address gets a small stand-in page (`MovedNotice`): its canonical names the new address and the browser is sent on. A static
  export cannot send a real 301; that would take a rule in `.htaccess` per old address (the sitemap data's `redirects` list has them all), which is not applied.
* An address made after the build has no file. `.htaccess` rule 4 already serves the shells `/category`, `/pages`, `/product`, `/lp` for such an address;
  the shell asks the API, follows a redirect hint, and shows the calm not-found state for an unknown slug. This is option (b), and it is already in place.
  Recommended: also rebuild after changing a slug, so the page has its own tags (option a).
* Proposed, **not applied**: protect the folders that belong to other things from every shop rule (the existing rule 00 names only `api|storage|admin`):

```
RewriteRule ^(api|storage|admin|stock|erp_app|feeds)(/|$) - [L]
RewriteRule ^\.well-known/ - [L]
```

  A top-level fallback is not needed today (addresses live under `/category`, `/pages`, `/lp`). If one is ever wanted, it must only apply when the path is
  not an existing file or directory and must exclude those names:

```
RewriteCond %{REQUEST_URI} !^/(stock|api|erp_app|feeds|storage|admin|\.well-known)(/|$)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([a-z0-9-]+)/?$ /<shell>.html [L]
```

* `node scripts/slug-scenario-check.cjs` builds the shop against a mock of the API (a category renamed, its old address remembered) and checks the built files
  and, in headless Chrome, that the old address, an address made after the build and an unknown address behave as described.

## 4. Invoice download

* The API gives every order a signed link (`invoice_url`, valid seven days) in the order answer, so a guest right after checkout and a customer who has
  just looked their order up on Track order need no login. The link is fetched, the PDF becomes a blob, and an anchor with `download` hands it to the browser
  as `AnaizaNest-Invoice-<order number>.pdf`; nothing uses `window.open`.
* Only the shop's own API is ever asked. A JSON error, a 403/404 (link wrong or out of date), a 500, a page that is not a PDF, or no answer all show:
  "We could not prepare your invoice just now. Please try again in a minute, or message us on WhatsApp with your order number." The button is disabled and
  says "Preparing your invoice..." while it works; a second press does nothing.
* Where: the order confirmation page and the Track order result. The account page has no order list, so there is no account order detail.

## 5. Order status words

| API status | Shown as |
|---|---|
| pending | Order received |
| processing | Being prepared |
| shipped | On its way |
| delivered | Delivered |
| cancelled | Cancelled |
| returned | Returned |
| anything else | In progress |

(`confirmed`, `completed`, `refunded`, `on_hold` and `out_for_delivery` are also named, in case they are ever sent.) A code is never shown.
