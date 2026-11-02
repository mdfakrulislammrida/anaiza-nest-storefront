# Batch CRO1: mobile journey audit (checkout address, brand check, safe fixes)

How it was measured: `scripts/journey-audit.cjs` (every page of the built shop at 360, 390, 430, 768 and 1280 px in headless Chrome: overflow, controls under
44 px, text fields under 16 px, contrast, images, banned words, colours, corners, shadows, gradients, fonts, fixed pieces overlapping, console errors, LCP,
layout shift, bytes), `scripts/checkout-address-check.cjs` (every division and district through the real dropdowns), `scripts/geo-check.ts` (the data).
Output and screenshots go to `docs/cro-screenshots/` (not committed). Run them after `npm run build`.

## Phase 1: the checkout address

* **Data source:** one static file, `src/lib/bangladesh-geography.ts` (8 divisions, 64 districts, 544 thanas: 494 upazilas from a community dataset plus Dhaka's 50 city
  thanas). Nothing is read from the API. The same names go to the order (`division`, `district`, `thana`); the delivery fee depends on the **division** only
  (`deliveryChargeFor`), and the backend's shipping zone, the courier booking and every saved order use the names as written.
* **Counts and problems** (`npm run geo:check`): 8 / 64 / 544, no empty, padded, repeated or missing entry, every district has thanas, Dhaka's city thanas are there.
  Two district lists were out of alphabetical order (Chattogram, Rajshahi): reordered only. The data is now pinned by a hash in `src/lib/geography.test.ts`, so a name
  cannot change by accident.
* **Irregular or older spellings, NOT changed** (for the owner and the backend session; the courier mapping may depend on them): Comilla Sadar (district is Cumilla),
  Coxsbazar Sadar (Cox's Bazar), Barisal Sadar (Barishal), Bogra Sadar (Bogura), Jessore Sadar (Jashore), Jhalakathi Sadar (Jhalokati), Borhan Sddin (Borhanuddin),
  Charfesson (Char Fasson), Doulatkhan (Daulatkhan), Kishorganj in Nilphamari (Kishoreganj), Syedpur (Saidpur), Louhajanj (Lohajang), Zajira (Zanjira), Faridgonj
  (Faridganj), Senbug (Senbagh), Dewangonj (Dewanganj), Mohongonj (Mohanganj), Nondigram (Nandigram), Shajahanpur (Shahjahanpur), Monohargonj.
* **Behaviour** (`npm run address:check`, real dropdowns, 390 and 360 px): all 64 districts walked. Choosing a division clears the district and the thana and shows that
  division's districts; choosing a district clears the thana and offers its thanas (counted); changing the district never leaves the old thana; the delivery line follows at
  once (Dhaka division ৳80, every other division ৳150, free only for Dhaka division over ৳10,000, outside Dhaka still ৳150 over the threshold); the disabled boxes say what to do first.
  There is no saved checkout draft to restore.
* **Fixed:** the dropdown button and every text input on the site were 42 px tall: now at least 44 px; a short list (the divisions, small districts) opens without a search box
  and keyboard (the keyboard hid half of it); the sheet height uses the visible screen; focus returns to the button on close; the street address is a textarea with a hint.
* **Decided (Batch FEE1, see dhaka-city-delivery.md): "inside Dhaka" is now Dhaka city only.** Before that the rule used the *division*: Gazipur, Narayanganj, Tangail and the rest of Dhaka division pay ৳80 and get free delivery over ৳10,000. The street-address box
  used to appear only after a thana was chosen; it now appears as soon as Inside or Outside is chosen.

## Phase 2 and 3: findings

| Page | Finding | Evidence (390 px) | Severity | Status |
|---|---|---|---|---|
| All | Controls under 44 px (icon buttons 40, card buttons 40, filter chips 36, accordion headers 24, pagination 36, gallery dots 24) | 19 to 40 per page before; 4 to 10 after, all pages | high | fixed (`h-11`, `min-h-11`) |
| All forms | Text inputs and the dropdown 42 px | measured 42 | medium | fixed |
| Account, track order, contact, newsletter | Labels not tied to their fields (a screen reader reads "edit text") | 14 fields | medium | fixed (`htmlFor` and `id`, `aria-label`) |
| All | Logo and occasion-tile images had no width and height | home 10 images, others 2 | medium | fixed |
| Blog article | "In this article" in stone on linen is 4.41:1 (needs 4.5) | 1 caption | low | fixed (charcoal) |
| Checkout | Street address was a single-line input | — | medium | fixed (textarea, hint) |
| All | Overflow, text under 16 px, off-kit colours, wrong corners, shadows, gradients, banned words, exclamation shouting, fixed pieces overlapping | all 0 on all 20 pages | — | none found |
| All | Fonts: first family is "Taka" (a font that supplies only the ৳ sign, then Inter and Fraunces) | by design | — | none |
| Blog, checkout | Article pictures and payment logos have no width and height | blog 4, checkout 2 | low | decision (the API does not send their size; guessing a ratio could shift the layout) |
| Home | Occasion tiles are 600 px wide for a 171 px box (about 3.5x at the phone's pixel ratio) | 8 pictures | medium | backend: a 400 px tile size |
| Pages with breadcrumbs | The breadcrumb links are 16 px tall text links | 12 pages | low | decision (inline links are exempt; a larger tap area changes the layout) |
| Header | Gifts, Blog and FAQs links are 44 px tall and 35 to 39 px wide | all pages | low | left |
| Console | Local only: 404s for the `__next.*.txt` prefetch files because the test server has no `.htaccess`; on the live site those answer 200. The "503 HEAD" errors did not reproduce, so no `prefetch={false}` was added | live HEAD 200 | low | none |

## Speed (throttled: 4x slower CPU, slow 4G; local pages, live pictures; for comparing, not Lighthouse)

| Page | LCP element | LCP | CLS | TBT | JS (not gzipped here) | Pictures |
|---|---|---|---|---|---|---|
| Home | the first banner picture (900 px WebP, 58 KB) | 1.98 s | 0 | 534 ms | 577 KB | 427 KB |
| Product | the main picture (800 px WebP), already `fetchpriority=high` | 3.75 s | 0 | 86 ms | 619 KB | 230 KB |
| Cart | a text paragraph | 1.45 s | 0 | 114 ms | 590 KB | 4 KB |
| Checkout | a text paragraph | 1.36 s | 0.027 | 251 ms | 622 KB | 7 KB |

Unthrottled, before the fixes: LCP 488 ms home, 916 ms product, 224 ms cart, 144 ms checkout; CLS 0 on all four. After: 604, 244, 120 and 108 ms, CLS 0 (0.027 on
the checkout under throttling): the changes are sizes and labels, not loading, and the run-to-run spread here comes from the live pictures. Controls under 44 px across the 20 pages at 390 px:
464 before, 85 after (the rest are text links: the header's three words, breadcrumbs, a card's title link). The fixes here do not change LCP. The preloaded logo is a 9.8 KB SVG
(3.9 KB gzipped), so it does not compete with the banner. Not measured here: Speed Index, the split of unused JavaScript between our code and the tags, Lighthouse.
Live cache headers: the hashed `/_next/static` files are already `max-age=31536000, immutable`; pictures from the API storage are `max-age=604800` (7 days) and HTML is `no-cache`.

Proposed for the API host's `.htaccess` (the `api` folder, not the shop's; for the owner to approve, with `stock`, `erp_app`, `feeds` and `.well-known` left alone):

```
<IfModule mod_expires.c>
  ExpiresActive On
  <FilesMatch "\.(webp|png|jpe?g|svg|woff2)$">
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```
(only safe because the generated picture names contain a unique id, so a changed picture has a new name.)

## Top 10 decisions for the owner, by expected effect on orders

1. Whether "inside Dhaka" means the Dhaka division or the city (fee and free delivery for Gazipur, Narayanganj and others).
2. Correct the district and thana spellings above together with the backend, so couriers get names they recognise (fewer wrong or returned parcels).
3. Show the street address as soon as Inside or Outside Dhaka is chosen, instead of after the thana (fewer abandoned checkouts).
4. A 400 px size for the occasion tiles (and the product list pictures) from the backend: about 100 KB less on the home page for a phone.
5. Give the API's article pictures and payment logos a stored width and height, so the storefront can reserve their space.
6. Long cache for the API's generated pictures (the snippet above): repeat visits are faster.
7. A preload for the first banner picture on the home page (LCP 1.98 s throttled).
8. A larger tap area for breadcrumb links and the three header text links.
9. A review of the product page's order bar and gallery on a real phone (this audit measured sizes, not the feel of the page).
10. A Lighthouse run on the final build for Speed Index and the unused-JavaScript split.
