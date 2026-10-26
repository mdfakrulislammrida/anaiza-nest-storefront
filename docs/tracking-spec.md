# Tracking spec: what the storefront sends

Written from the code (`src/lib/tracking.ts`, `src/lib/consentBootstrap.ts`, `src/components/MarketingScripts.tsx`, the order confirmation page) and
the shop's server (`SendMetaConversionEvent`, `SendTikTokConversionEvent`, `ConversionEvents`). The tests named at the end keep it true.

## In one minute

- The shop has **two ways** to run the browser tags, chosen by one setting:
  1. **A Google Tag Manager container ID is saved** (Marketing Settings > Google Tag Manager Container ID): **GTM owns every browser tag** (GA4, Meta
     Pixel, TikTok Pixel). The site loads only GTM, fills the **data layer**, and never calls `gtag`, `fbq` or `ttq` itself.
  2. **No GTM ID**: the site loads GA4 (`gtag.js`), the Meta pixel and the TikTok pixel itself, and calls them directly. The data layer is filled the same.
- **Never both.** This is what stops an event being counted twice. (Before this batch, a saved GTM ID and a saved Meta or TikTok pixel ID loaded the
  pixel twice: once by the site, once by any pixel tag in the container.)
- The shop's **server** sends the Purchase to Meta (Conversions API) and TikTok (Events API) on its own, in either mode. It uses the same event id as the
  browser's Purchase (`order-<order number>`), so each platform counts the sale once.
- Everything is in **taka (`BDT`)**, values are **numbers**, and `item_id` is the product's **SKU** (the same id the product feeds use).
- No raw email, phone number or name is ever in the data layer. Hashed details (SHA-256) appear on the purchase only when the visitor allowed marketing.

## 1. How each tag is loaded

### Which setting loads what

Marketing Settings are read **when the storefront is built** (they are baked into the pages), so a changed ID needs a new build and upload to take effect.
The four IDs are also served by `GET /api/marketing-settings` (public, no secrets) so a container can use them as constants.

| Marketing Settings field | Direct mode (no GTM ID) | GTM mode (GTM ID saved) |
| --- | --- | --- |
| Google Tag Manager Container ID (`gtm_container_id`) | n/a | The site loads `gtm.js?id=<ID>` and nothing else of Google's or Meta's or TikTok's |
| Google Analytics 4 ID (`ga4_id`) | Loaded by the site: `gtag.js`, then `gtag('config', <ID>)` | **Not loaded by the site.** GA4 is a tag in the container (its Measurement ID is a constant there) |
| Meta Pixel ID (`meta_pixel_id`) | Loaded by the site (`fbevents.js`, `fbq('init')`, `PageView`), and every event is sent with `fbq` | **Not loaded by the site**, and no Meta no-script image. A Custom HTML tag in the container runs the pixel |
| TikTok Pixel ID (`tiktok_pixel_id`) | Loaded by the site (`events.js`, `ttq.load`, `ttq.page`), events sent with `ttq` | **Not loaded by the site.** A Custom HTML tag in the container runs it |
| Meta Conversions API token, TikTok Events API token | Server only. Write-only in the admin, never in the API or the page | Same |
| Meta / TikTok test event codes | Server only: while one is filled in, the server's Purchase also carries it | Same (clear it after testing) |

In GTM mode the page's data (`window.anaizaConsent.config`) records the container, and `tracking.ts` checks it (`gtmOwnsBrowserTags()`): `fbq`, `ttq` and Meta
advanced matching are skipped even if a container's own tag has defined `fbq` / `ttq` on the page.

### When the files load (the Batch T rule, and GTM)

To keep phones fast, the tags' own files are fetched **late**: on the visitor's first touch, tap, key press or scroll, or **4 seconds after the page has
loaded**, whichever is first. **On `/checkout` and `/order-confirmation` they are fetched at once**, so a sale is counted even if the visitor leaves in a second.
This applies to **GTM** exactly as it did to the pixels: `gtm.js` is fetched late. What the tags must hear in the meantime is set up at once, so nothing is lost:

- Consent Mode defaults are set before anything else (section 5).
- `window.dataLayer` exists from the first moment. Every event the shop pushes before GTM has arrived waits in it, and GTM **replays them in order** when it starts, so
  a Custom Event trigger still fires for an event pushed earlier (a `view_item` pushed at 0.5 s fires when GTM arrives at 4 s).
- In direct mode the Meta and TikTok queues (`fbq` / `ttq`) are created at once and keep events until the files arrive.

### The no-script fallbacks

Only when the cookie banner is not in opt-in mode: GTM mode renders GTM's own no-script iframe; direct mode renders the Meta no-script image. (Never both.)

## 2. Page views

| | Direct mode | GTM mode |
| --- | --- | --- |
| First page of a visit | GA4: `gtag('config')` sends `page_view`. Meta: `fbq('track','PageView')` in the base snippet. TikTok: `ttq.page()` | The container's tags: the Google tag (GA4 `page_view`), the Meta base tag (`PageView`), the TikTok base tag (`ttq.page()`) |
| Each client-side page change (the shop is a client-routed app: links do not reload the page) | GA4: its Enhanced measurement "page changes based on browser history events". Meta: `fbq('track','PageView')`. TikTok: `ttq.page()`. All called by `RouteChangeTracker` | GA4: the same Enhanced measurement setting (it must stay on). Meta and TikTok: the site pushes `page_view` (below) and the container's tags listen for it |

`RouteChangeTracker` watches the path only (not the search or filter), and skips the first page of a visit.

**`page_view`** (GTM mode only; a page change, never the first page)

| | |
| --- | --- |
| Trigger condition | The path changed through a link or the back button |
| Data layer | `{ "event": "page_view", "page_location": "https://anaizanest.com/shop", "page_path": "/shop", "page_title": "Shop | Anaiza Nest" }` |

## 3. Events

Every ecommerce event is pushed as **two** data layer entries: `{ "ecommerce": null }` first (so fields never carry over from the previous event), then the event.
A tag listens for the **event** entry. Event names are GA4's own.

| Event | Fired by | GA4 | Meta pixel | TikTok pixel |
| --- | --- | --- | --- | --- |
| `view_item_list` | The shop, category, special prices and search pages when results load; a landing page once | yes | landing pages only: `ViewContent` | landing pages only: `ViewContent` |
| `view_item` | A product page opens | yes | `ViewContent` | `ViewContent` |
| `search` | The shop page opens with `?search=` | yes | no | no |
| `add_to_cart` | Add to cart | yes | `AddToCart` | `AddToCart` |
| `remove_from_cart` | A line is removed from the cart | yes | no | no |
| `view_cart` | The cart page, with something in it | yes | no | no |
| `begin_checkout` | The checkout opens with something in the cart | yes | `InitiateCheckout` | `InitiateCheckout` |
| `add_shipping_info` | Inside / Outside Dhaka is chosen | yes | no | no |
| `add_payment_info` | A payment method is chosen (or, if never touched, when the order is sent) | yes | `AddPaymentInfo` (container only) | `AddPaymentInfo` (container only) |
| `purchase` | The order confirmation page, for a cash-on-delivery order | yes | `Purchase` | `CompletePayment` |
| `order_pending_payment` | The order confirmation page, for a bKash / Nagad / Rocket order | no | no | no |
| `page_view` | GTM mode only: a page change | no (GA4 counts it itself) | `PageView` | `ttq.page()` |
| `anaiza_consent_changed` | GTM mode only: the visitor saved a cookie choice | no | starts the base tag | starts the base tag |

"container only": direct mode never sent Meta / TikTok `AddPaymentInfo`; the container does (a standard event both platforms offer).

Item fields, everywhere an item appears: `item_id` (the SKU; a variant with its own SKU is reported by it; with no SKU, the product id as text), `item_name`,
`price` (taka, a number, the price actually charged), `quantity`, and, on product-based events (`view_item_list`, `view_item`, `add_to_cart`), `item_category`
(the category name).

### `view_item_list`

| | |
| --- | --- |
| Trigger condition | Product results are on screen: each time the shop, a category, special prices or a search loads or changes page, sort or filter; a landing page once per visit, with its products |
| Parameters | `item_list_name` (the page's breadcrumb label, or `Landing page: <slug>`), `items[]`. Landing pages also send `currency` |

```json
{ "event": "view_item_list", "ecommerce": { "item_list_name": "Tea sets", "items": [
  { "item_id": "TEA-SET-4", "item_name": "Floral ceramic tea set for 4, with tray", "price": 4200, "item_category": "Tea sets", "quantity": 1 } ] } }
```

### `view_item`

| | |
| --- | --- |
| Trigger condition | A product page opens (once per product page, not again when the page refreshes its data in the background) |
| Parameters | `currency` "BDT", `value` (the price, a number), `items[]` with one item |

```json
{ "event": "view_item", "ecommerce": { "currency": "BDT", "value": 1850, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "item_category": "Tea jars", "quantity": 1 } ] } }
```

### `search`

| | |
| --- | --- |
| Trigger condition | The shop page is opened with, or changed to, a search term (`/shop?search=tea`). Note: the empty-cart button "Shop tea sets" links to `?search=tea sets`, so it counts as a search |
| Parameters | `search_term` (trimmed text) |

```json
{ "event": "search", "search_term": "tea set" }
```

### `add_to_cart`

| | |
| --- | --- |
| Trigger condition | Add to cart on a product page or card |
| Parameters | `currency`, `value` (price x quantity), `items[]` with one item and its `quantity` |

```json
{ "event": "add_to_cart", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "item_category": "Tea jars", "quantity": 2 } ] } }
```

### `remove_from_cart`

| | |
| --- | --- |
| Trigger condition | A line is removed from the cart (changing a quantity with the stepper is not reported) |
| Parameters | `currency`, `value` (price x quantity of the line), `items[]` with the line |

```json
{ "event": "remove_from_cart", "ecommerce": { "currency": "BDT", "value": 1850, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 1 } ] } }
```

### `view_cart`

| | |
| --- | --- |
| Trigger condition | The cart page, once per visit to it, after the saved cart has been read and has something in it |
| Parameters | `currency`, `value` (the cart's items total), `items[]` with every line |

```json
{ "event": "view_cart", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2 } ] } }
```

### `begin_checkout`

| | |
| --- | --- |
| Trigger condition | The checkout page opens and the cart has something in it (once; it waits for the saved cart). In a landing page's order form: the first time the visitor touches the form |
| Parameters | `currency`, `value` (the items total, **without** delivery), `items[]` with every line |

```json
{ "event": "begin_checkout", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2 } ] } }
```

### `add_shipping_info`

| | |
| --- | --- |
| Trigger condition | The visitor chooses "Inside Dhaka" or "Outside Dhaka" (each choice) |
| Parameters | `currency`, `value` (items total), `shipping_tier` ("Inside Dhaka" or "Outside Dhaka"), `items[]` |

```json
{ "event": "add_shipping_info", "ecommerce": { "currency": "BDT", "value": 3700, "shipping_tier": "Inside Dhaka", "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2 } ] } }
```

### `add_payment_info`

| | |
| --- | --- |
| Trigger condition | The visitor picks a payment method (each pick). If they never touched it (the first method was already chosen for them) it is sent once when they press Confirm order |
| Parameters | `currency`, `value` (items total), `payment_type` (`cod`, `bkash`, `nagad` or `rocket`), `items[]` |

```json
{ "event": "add_payment_info", "ecommerce": { "currency": "BDT", "value": 3700, "payment_type": "cod", "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2 } ] } }
```

### `purchase`

| | |
| --- | --- |
| Trigger condition | The order confirmation page opens for a **cash-on-delivery** order that has not been reported in this browser tab before (section 4), after the order was placed |
| Parameters | `event_id` (`order-<order number>`, **outside** `ecommerce`), `ecommerce.transaction_id` (the order number, text), `ecommerce.value` (the order **total**, delivery included, a number), `currency`, `shipping` (the delivery fee), `items[]`. With marketing allowed: `user_data` and `meta_user_data` (hashed, section 6) |

```json
{ "event": "purchase", "event_id": "order-1042",
  "ecommerce": { "transaction_id": "1042", "value": 3780, "currency": "BDT", "shipping": 80, "items": [
    { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2 } ] },
  "user_data": { "sha256_email_address": "<64 hex>", "sha256_phone_number": "<64 hex>",
    "address": { "sha256_first_name": "<64 hex>", "sha256_last_name": "<64 hex>", "city": "dhaka", "region": "dhaka", "country": "BD" } },
  "meta_user_data": { "em": "<64 hex>", "ph": "<64 hex>", "fn": "<64 hex>", "ln": "<64 hex>", "ct": "<64 hex>", "st": "<64 hex>", "country": "<64 hex>" } }
```

Direct mode also calls `fbq('track','Purchase', {...}, { eventID: 'order-1042' })` and `ttq.track('CompletePayment', {...}, { event_id: 'order-1042' })`.

### `order_pending_payment`

| | |
| --- | --- |
| Trigger condition | The order confirmation page for a bKash, Nagad or Rocket order: it is **not a sale yet** (the money must be matched and verified by the shop) |
| Parameters | `order_id`, `payment_type`. No value, no items, no buyer data, nothing a platform could read as a purchase |

```json
{ "event": "order_pending_payment", "order_id": "1043", "payment_type": "bkash" }
```

The sale for such an order reaches Meta and TikTok **from the server only, when the shop verifies the payment** (and never reaches GA4: there is no server-side GA4 yet).

### `anaiza_consent_changed` (GTM mode only)

| | |
| --- | --- |
| Trigger condition | The visitor saves a cookie choice (banner or footer "Cookie settings") |
| Parameters | `analytics_consent`, `marketing_consent`: `granted` or `denied` |

```json
{ "event": "anaiza_consent_changed", "analytics_consent": "granted", "marketing_consent": "granted" }
```

The container uses it to start the Meta and TikTok base tags that were held back for lack of consent.

### Not sent

`select_item`, `select_promotion`, `view_promotion`, `add_to_wishlist`, `refund`, `login`, `sign_up`, `generate_lead`, a coupon (`coupon` is never pushed; the
container has a variable ready for it), and `page_view` in direct mode (GA4 handles it).

## 4. Purchase: once, and the same id everywhere

- **Where it fires:** `src/app/order-confirmation/page.tsx`. The order is read from the browser tab (`sessionStorage`, the "last order" the checkout saved) and
  `trackPurchase(order)` runs once.
- **Not twice:** before it runs, the order number is looked up in `sessionStorage` under `anaiza-purchase-tracked`; if it is there nothing is sent, otherwise it
  is added first. A **reload, back/forward, or reopening the page in the same tab** therefore sends nothing. A different tab has no "last order", so shows "No recent
  order found" and sends nothing.
- **The ids:** `transaction_id` = the order number (`order.id`, text). `event_id` = `order-<order number>`, for example `order-1042`.
- **How the server gets the same id:** it does not need to be sent. Both sides derive it from the order's own id: the browser from `id` in the API's order response
  (`POST /api/orders` returns `data.id`, kept as the "last order"), the server from `$order->id` (`'event_id' => "order-{$order->id}"`, in `SendMetaConversionEvent` and
  `SendTikTokConversionEvent`). Both use the event name `Purchase` (Meta) and `CompletePayment` (TikTok) on each side, which dedup needs (the same name and the same id,
  within 48 hours).
- **Server send:** at the moment a cash-on-delivery order is placed (right after the checkout response); for a wallet order, when an admin marks the payment verified.
  An order that is later cancelled is not reversed.

### What each side sends about the buyer (all SHA-256, hex)

| Data | Browser (only if marketing was allowed) | Server (Meta Conversions API) | Server (TikTok Events API) |
| --- | --- | --- | --- |
| Email | Google: `sha256_email_address`; Meta: `em` | `em` | `email` |
| Phone | Google: `sha256_phone_number` (+8801...); Meta: `ph` (8801..., no plus) | `ph` | `phone` |
| First / last name | Google `sha256_first_name`, `sha256_last_name`; Meta `fn`, `ln` | `fn`, `ln` | no |
| City, region | Google: `city`, `region` as plain lower-case text; Meta `ct`, `st` hashed | `ct`, `st` | no |
| Postal code, country | Google: `postal_code`, `country` "BD" as text; Meta `zp`, `country` hashed | `country` | no |
| Click ids | the pixel reads its own cookies | `fbc` (from the Facebook click id kept with the order) | `ttclid` |
| IP address, browser | n/a | plain (as the platforms require) | plain |

Normalisation (browser and server agree): email trimmed and lower case (Google also drops dots in gmail.com addresses); phone digits with country code 880; names,
cities and regions lower case, letters only (Bangla letters kept).

## 5. Consent

- **The banner** (Admin > Cookie consent) has two modes. **Notice mode:** everything is allowed until the visitor chooses. **Opt-in mode:** analytics and marketing are
  denied until they choose. The banner offers Necessary (always on), Analytics and Marketing.
- **What is stored:** one first-party cookie, `anaiza_consent`, value `a<0|1>m<0|1>` (analytics, marketing), kept 12 months, `SameSite=Lax`, `Secure` on https.
- **Google Consent Mode v2:** when a GTM ID or a GA4 ID is set, a script in `<head>` sets `gtag('consent','default', ...)` **before any Google tag loads** with all four signals:
  `analytics_storage` follows the analytics choice, and `ad_storage`, `ad_user_data` and `ad_personalization` follow the marketing choice. With no saved choice: all
  `granted` in notice mode, all **`denied`** in opt-in mode (with `wait_for_update: 500` ms). When the visitor chooses, `gtag('consent','update', ...)` is sent at once.
  With the banner switched off everything is `granted`.
- **Meta and TikTok before consent (direct mode):** their queues are created so events are kept, but the pixels' files are not fetched, and nothing reaches Meta or TikTok,
  until marketing is allowed. If the visitor allows it later, the files load then and the kept events are sent. If they withdraw it, `fbq('consent','revoke')` /
  `ttq.revokeConsent()` is called.
- **Meta and TikTok before consent (GTM mode):** nothing is loaded by the site. The container's pixel tags **require `ad_storage` to be granted**, so they do not run until marketing is allowed; then
  the `anaiza_consent_changed` event starts the base tags. Events that happened before the visitor allowed marketing are **not** replayed to Meta and TikTok in this mode.
- **Server events and consent:** the checkout sends the server `marketing_consent` (what the banner says at that moment). In opt-in mode a visitor who did not allow marketing is never sent
  server-side. **In notice mode the server sends the Purchase even if the visitor rejected cookies** (the mode's rule: notice, not consent). That is a policy choice, not a bug: ask a lawyer if unsure.

## 6. Customer-data rules

1. No raw email, phone number, name or address is pushed to the data layer or passed to a pixel, ever.
2. Hashed values (SHA-256, hex, normalised as above) are pushed only on `purchase`, and only when the visitor's choice allows marketing. They are in `user_data` (Google format)
   and `meta_user_data` (Meta format).
3. The hashed values are computed in the visitor's browser (`crypto.subtle`); a browser that cannot hash sends none.
4. Order numbers (`transaction_id`, `event_id`) are not personal data.

## 7. Checks that keep this true

- `src/lib/tracking.test.ts`: both modes (no `fbq` / `ttq` call in GTM mode; the same `order-<id>` in the data layer, Meta's `eventID` and TikTok's `event_id`; no raw
  personal data in the data layer; wallet orders are not revenue).
- `src/lib/consent.test.ts`: GTM mode loads only GTM; direct mode still loads GA4, Meta and TikTok; Consent Mode defaults, updates and the late loading.
- `src/lib/gtmContainer.test.ts`: every event above has a trigger in `docs/gtm-container-anaizanest.json`, and nothing the site pushes is missing from it.
