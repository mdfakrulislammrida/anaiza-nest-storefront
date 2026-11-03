# The Stape Custom Loader (Batch TRK6)

The web GTM container (`GTM-MS2HWSWF`) is no longer fetched from Google's `gtm.js`. It is fetched by Stape's Custom Loader, from the shop's own tagging domain
`https://metrics.anaizanest.com`. Reasons: Stape's Cookie Keeper (it extends `_fbp`, `_fbc`, `_ga` and `FPID`, which matters on Safari) only switches on once the
Google snippet is replaced by this loader, and a loader served from our own domain is less often blocked by ad blockers. GTM still owns GA4 and Meta, as before.
Consent mode ("Notice only", every default granted), the cookie banner, the event ids and the order of the data layer are untouched.

## What changed

| File | Change |
|---|---|
| `src/lib/stapeLoader.ts` (new) | Stape's script, byte for byte, in one constant. The host, the loader id and the `ax11` query live inside it and are read back out for tests and docs. `STAPE_CONTAINER_ID` for the no-script frame. |
| `src/lib/consentBootstrap.ts` | `gtm()` no longer injects `googletagmanager.com/gtm.js`. It still pushes `gtm.start` at the top of the page (before any page event, as always) and, at the same moment as before (first touch, 4 s after load, or at once on `/checkout` and `/order-confirmation`), runs Stape's script. |
| `src/components/MarketingScripts.tsx` | The no-script frame points at `https://metrics.anaizanest.com/ns.html?id=GTM-MS2HWSWF`. |
| `src/lib/consent.test.ts`, `src/lib/htaccess.test.ts` | Tests follow the new loader (see Tests). |
| `scripts/tracking-headless-check.cjs` | Expects the loader on the tagging domain; new assertions; `--safari-ua` and `--cookies`. |

How the loader runs: its text is put into a script element when the tags are due, and the browser runs it at once. It pushes `gtm.start` itself, so the push that
the bootstrap made at the top of the page is the only one that stays: the loader's own is held back once, only while it runs (`dataLayer.push` is put back at
once). The data layer therefore has exactly one `gtm.start`, in the same place as before: consent defaults, `gtm.start`, then `page_view` and the page's events.
Everything else about when the tags load (deferred to the first touch, immediate in the checkout) is as it was.

Where it is on the page: the same inline script in `<head>` (`MarketingHeadScripts`, rendered by `src/app/layout.tsx`), the no-script frame right after `<body>`.
The condition is unchanged: nothing is loaded unless the admin has a GTM container saved (Marketing settings).

## Updating the loader

Stape's text goes in `STAPE_LOADER_SOURCE` untouched. After pasting a new one, update the length and the hash in `src/lib/consent.test.ts` ("Stape's loader
text"); the test exists so a stray edit cannot slip through.

## Rollback (one commit)

The whole change is one commit. To go back to Google's loader:

```
git revert <the TRK6 commit hash>
npm run build   # with the live-domain variables, as in docs/cutover.md
```

then upload the new build as usual. Cookie Keeper stops working until the loader is put back.

## After deploy: what to check

1. **GTM Preview / Tag Assistant** still connects to the site (it connects through the loader; if it does not, the container is not being served).
2. In the page's console, `dataLayer` starts with `consent default`, then `gtm.start` (event `gtm.js`), then `page_view`, then the page's own event (`view_item` on a product).
   There is one `gtm.start`.
3. The Network tab shows one request to `metrics.anaizanest.com/d877ecfdyons.js?ax11=…` (on Safari 16.4 and newer the name has `kp` in it: `d877kpecfdyons.js`) and
   **none** to `googletagmanager.com/gtm.js`.
4. Stape: the Cookie Keeper "Action required" notice is gone.
5. Meta Events Manager, Test events: PageView, ViewContent and Purchase arrive, with their event ids, from the browser and (deduplicated) from the server.
6. GA4 DebugView shows `page_view` once per page.

## Measured in headless Chrome (`npm run tracking:check`)

* **Chrome (default):** one request, `https://metrics.anaizanest.com/d877ecfdyons.js?ax11=…`, one loader script tag, one `gtm.start` before `page_view`, none to `googletagmanager.com/gtm.js`.
* **Safari 17 (user-agent override, `--safari-ua`):** the loader asks for `https://metrics.anaizanest.com/d877kpecfdyons.js?ax11=…` (the id with `kp` in front of its last eight letters). Both files
  exist on the tagging domain (HTTP 200, no `Set-Cookie`). Playwright WebKit is not installed here, so this is Chrome pretending to be Safari: the loader's own rule (Safari 16.4 or newer in the
  user agent) is what is exercised, not Safari's engine. A real Safari should be checked once after deploy (Network tab: the `kp` file, one request).
* **Cookies and storage on a first visit** (`--real --as-live-host --cookies`, the real container; hits are recorded and never sent, so the cookies a tagging server sets on a hit, such as `FPID`
  or the extended `_fbp`/`_ga`, cannot show up in a local run and must be checked live):

| Name | Set by | Lifetime | New in this batch? |
|---|---|---|---|
| `an_eid` | the shop's page (visitor id) | 400 days | no |
| `anaiza_consent` | the shop's page, only after a banner choice | 12 months | no |
| `_ga`, `_ga_1V0Q6EN05B` | the GA4 tag in the container | 400 days (Chrome's cap) | no |
| `_fbp` | the Meta tag in the container | 90 days | no |
| `_clck`, `CLID`, `MUID`, `MR`, `SRM_B`, `SM`, `ANONCHK` | Microsoft Clarity (its own domains and `anaizanest.com`) | session to 390 days | no |
| localStorage `anaiza-cart`, `anaiza-wishlist`, `lastExternalReferrer`, `lastExternalReferrerTime` | the shop's page | until cleared | no |
| sessionStorage `_cltk` | Clarity | the tab | no |
| localStorage `_xsd` | Stape's code in the file served by the tagging domain (the file contains `_xsd:state`) | until cleared | **yes** |

The same run against the previous build (Google's loader) set exactly the same 13 cookies with the same lifetimes. The only difference is the `_xsd` localStorage key. The loader file's own
response sets no cookie.

Two real-mode differences that are **not** caused by this batch: with `--as-live-host` the page is plain `http` on a non-localhost name, which has no `crypto.subtle`, so the visitor-id hash
(`user_data.external_id`) cannot be made and that one assertion fails in that mode (it also fails on the previous build); on plain localhost the Google tag sends only one GA4 hit, which is why the
flag exists. Also, with the real container the page has a second script from the tagging domain, `https://metrics.anaizanest.com/gtag/js`: that is the container's GA4 tag, served by Stape, not a second loader.

## Findings

* **If `metrics.anaizanest.com` is unreachable** (DNS, the Stape subscription, a certificate), the loader file does not arrive and the whole web container does not load:
  no GA4, no Meta Pixel, no browser-side events. Before, Google's own server served the container. No fallback is built (by decision); the shop itself keeps working.
* **Content-Security-Policy:** `public/.htaccess` has a CSP that is **Report-Only** (it blocks nothing). It does not list `https://metrics.anaizanest.com`, so a browser
  will log a report-only violation for the loader (`script-src`), its requests (`connect-src`) and the no-script frame (`frame-src`). Nothing breaks today. Before the policy is ever
  switched to enforcing, add `https://metrics.anaizanest.com` to `script-src`, `connect-src` and `frame-src` (a test, "names the tagging domain before the policy is ever enforced",
  fails then as a reminder). `.htaccess` was not changed in this batch. No Next config header sets a CSP and there is no CSP meta tag.
* **Still loaded from Google or Facebook, by design:** with the container, GA4 and the Meta Pixel are tags inside it, so their own files and hits go to Google
  (`google-analytics.com`, `googleadservices`, `doubleclick`) and Meta (`connect.facebook.net/en_US/fbevents.js`, `facebook.com/tr`) as before. Without a container saved,
  the site's direct GA4 fallback (`googletagmanager.com/gtag/js`) and the direct Meta and TikTok pixels still load, as before; the GTM loader is not part of that path.
