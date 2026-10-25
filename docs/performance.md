# Mobile performance (Batch T)

## How it is measured

Lighthouse 12, mobile preset (the PageSpeed Insights settings: Moto G class, slow 4G, 4x CPU slowdown), against the built site served
the way the host serves it (clean URLs, the fallback shells, gzip). The build is made with `NEXT_PUBLIC_API_URL` pointing at a read-only
proxy to the live API that allows any origin, so the page can fetch its data as it does on new.anaizanest.com. These are lab numbers from
one machine: compare them with each other, not with PageSpeed Insights' absolute scores.

| Page (mobile, median of 3) | Performance | LCP | CLS | TBT | Page weight |
| --- | --- | --- | --- | --- | --- |
| Home, before | 51 | 9.2 s | 0.002 | 1,124 ms | 1,152 KB |
| Home, after | 92 | 3.3 s | 0.001 | 58 ms | 633 KB |
| Product, before | 73 | 9.1 s | 0.003 | 860 ms | 820 KB |
| Product, after | 92 | 3.3 s | 0.001 | 75 ms | 563 KB |
| Category, before | 63 | 8.7 s | 0.005 | 888 ms | 992 KB |
| Category, after | 89 | 3.4 s | 0.001 | 158 ms | 706 KB |

Desktop (home): 100 before and after. Accessibility 100 and best practices 100 on the three mobile pages (95 and 75 before).

## What was slowing the page

1. **The advertising pixels.** Meta's two files (270 KB) and their processing started the moment the page did, and held the phone's
   processor for over a second (TBT 1.1 s) while the hero picture waited to be drawn (its "render delay" was 6 of 9 seconds). They now load
   on the visitor's first touch, tap, key press or scroll, or 4 seconds after the page has loaded, whichever is first (the checkout and the
   confirmation load them at once, so a sale is counted even if the visitor leaves in a second). Consent Mode, the data layer and the pixels'
   event queues are set up at once, so nothing is lost; a pixel the visitor rejected while it waited is not fetched, and one allowed
   afterwards is. See `consentBootstrap.ts` (`defer`).
2. **Quiet refresh requests at load.** Nine API calls (the featured products alone are 60 KB) and four background page fetches started with
   the page and shared the connection with the hero picture. The refreshes of the build's copy of settings, categories, lists, cookie
   wording and popups now wait until 2.5 s after the page has loaded (`afterLoad.ts`); anything the page cannot show without (settings when
   the build had none) is still asked for at once. The links in the first screen no longer prefetch their pages in the background.
3. **A console error and wasted downloads.** Next asks for each linked page's small navigation file as `/shop/__next.shop.__PAGE__.txt`,
   but the build writes it as `/shop/__next.shop/__PAGE__.txt`. Every such request was a 404 (a red console error, and a 45 KB error page
   downloaded each time). `.htaccess` now maps one to the other (rule 0b, tested).
4. **Accessibility regressions from earlier batches**, found by the audit: the Menu button pointed at a menu that is not in the page until it is
   open, a product card's picture link had a name that did not match its tag text, and the category page skipped a heading level.
5. **Animation.** The pour line drew itself by growing its height (repainted on every frame); it now slides in by transform. The free-delivery
   line scales instead of resizing. The WhatsApp bubble rises above the cookie banner by transform, so it no longer counts as a layout shift.

## Tried and not kept

- Inlining the stylesheet (`experimental.inlineCss`): the HTML grew from 156 KB to 364 KB (the CSS is written into the page three times) and the score fell.
- Not preloading the heading font: no gain.

## What is left, and where it lives

- The home page's two side pictures are 1200 px wide files shown at 412 px on a phone (about 100 KB too much). The picture pipeline in the API
  would need an 800 px size for them.
- The two files flagged as "legacy JavaScript" (14 KB) are inside Next's own runtime and cannot be removed from here. The old-browser
  polyfill chunk is marked `nomodule`, so modern phones never download it.
- Biggest bundles (compressed): React's runtime 70 KB, Next's client 45 KB, the old-browser polyfill 39 KB (not downloaded by modern phones),
  then eleven pieces of 9 to 13 KB. The page's own stylesheet is 12 KB.

## Cache lifetimes (`public/.htaccess`)

Hashed files under `/_next/static/` and fonts/images: one year, immutable. Favicon: one day. HTML, navigation files, sitemap, robots: `no-cache` (always revalidated, a
304 when unchanged, so a deploy shows at once). No HSTS and no enforced CSP beyond framing (unchanged), and the staging noindex and `robots.txt` are untouched.
