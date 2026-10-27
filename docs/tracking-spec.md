# Tracking spec: what the storefront sends

Written from the code (`src/lib/tracking.ts`, `src/lib/userData.ts`, `src/lib/consentBootstrap.ts`, `src/components/MarketingScripts.tsx`, the order confirmation page,
the route tracker) and the shop's server (`SendMetaConversionEvent`, `SendTikTokConversionEvent`, `ConversionEvents`). The tests named at the end keep it true.

## In one minute

- The shop has **two ways** to run the browser tags, chosen by one setting:
  1. **A Google Tag Manager container ID is saved** (Marketing Settings > Google Tag Manager Container ID): **GTM owns every browser tag** (GA4 and the Meta Pixel; the
     TikTok pixel too, if one is set). The site loads only GTM, fills the **data layer**, and never calls `gtag`, `fbq` or `ttq` itself.
  2. **No GTM ID**: the site loads GA4 (`gtag.js`), the Meta pixel and the TikTok pixel itself, and calls them directly. The data layer is filled the same.
- **Never both.** This is what stops an event being counted twice by the browser.
- **Every event carries an `event_id`** (`<event>.<16 characters>`; a purchase has `order-<order number>`). The browser tags send it with their event; the **server container** (Stape)
  forwards the same id to Meta's Conversions API, which then counts the browser event and the server event **once** (same event name and same id).
- The shop's own **server** also sends the Purchase to Meta (Conversions API) and TikTok (Events API), with the same `order-<order number>` id. While the server container
  sends Purchase too, Meta merges them by that id (see "Value" in section 4: they must also agree on the value).
- Everything is in **taka (`BDT`)**, values are **numbers**, and `item_id` is the product's **SKU** (the same id the product feeds use).
- **A purchase's value is the items total after any discount, without delivery** (delivery is in `shipping`).
- No raw email, phone number or name is ever in the data layer. Hashed details (SHA-256) are pushed on three events, and only when the visitor allowed marketing.

## 1. How each tag is loaded

### Which setting loads what

Marketing Settings are read **when the storefront is built** (they are baked into the pages), so a changed ID needs a new build and upload to take effect.
The four IDs are also served by `GET /api/marketing-settings` (public, no secrets) so a container can use them as constants.

| Marketing Settings field | Direct mode (no GTM ID) | GTM mode (GTM ID saved) |
| --- | --- | --- |
| Google Tag Manager Container ID (`gtm_container_id`) | n/a | The site loads `gtm.js?id=<ID>` and nothing else of Google's or Meta's or TikTok's |
| Google Analytics 4 ID (`ga4_id`) | Loaded by the site: `gtag.js`, then `gtag('config', <ID>)` | **Not loaded by the site.** GA4 is a tag in the container (its Measurement ID is a constant there) |
| Meta Pixel ID (`meta_pixel_id`) | Loaded by the site (`fbevents.js`, `fbq('init')`, `PageView`), and every event is sent with `fbq` | **Not loaded by the site**, and no Meta no-script image. A Custom HTML tag in the container runs the pixel |
| TikTok Pixel ID (`tiktok_pixel_id`) | Loaded by the site (`events.js`, `ttq.load`, `ttq.page`), events sent with `ttq` | **Not loaded by the site.** A tag in the container runs it (container version 2 has none: the shop has no TikTok pixel) |
| Meta Conversions API token, TikTok Events API token | Server only. Write-only in the admin, never in the API or the page | Same |
| Meta / TikTok test event codes | Server only: while one is filled in, the server's Purchase also carries it | Same (clear it after testing) |
| **The server container's address** | **Not a Marketing Settings field. There is none.** It is kept in one place only: the GTM constant `AN - Server URL` in the web container (`NONE` = no server container). Changing it needs no storefront build, only a GTM publish | Same |

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

`RouteChangeTracker` pushes **one `page_view` for each page of a visit, the first page included**, in both modes. It watches the path only (not the search or filter), waits a moment
after the path changes so the page's title is the new one, and never pushes the same path twice in a row (so the first page is not counted twice).

| | Direct mode | GTM mode |
| --- | --- | --- |
| First page of a visit | GA4: `gtag('config')` sends `page_view`. Meta: `fbq('track','PageView')` in the base snippet. TikTok: `ttq.page()`. The `page_view` event is also in the data layer (nothing reads it) | Container version 2: the GA4 `page_view` tag and the Meta `PageView` tag both fire on the shop's `page_view` event, with its `event_id`. The Google tag does **not** send a page view itself (`send_page_view` is off) |
| Each client-side page change (the shop is a client-routed app: links do not reload the page) | GA4: its Enhanced measurement "page changes based on browser history events". Meta: `fbq('track','PageView', ..., { eventID })`. TikTok: `ttq.page()` | The same `page_view` event and the same tags. **Enhanced measurement's "page changes based on browser history events" must be OFF in the GA4 data stream** (otherwise GA4 also counts each page change itself and doubles it) |

**`page_view`**

| | |
| --- | --- |
| Trigger condition | A page of the visit was opened: the first page, or the path changed through a link or the back button |
| Data layer | `{ "event": "page_view", "event_id": "page_view.3f9a1c07b2e84d65", "page_location": "https://anaizanest.com/shop", "page_path": "/shop", "page_title": "Shop | Anaiza Nest", "page_referrer": "https://anaizanest.com/" }` |

`page_referrer` is the page the visitor came from: the referring site on the first page, the previous page of the shop after that.

## 3. Events

Every event is pushed as **two** data layer entries: `{ "ecommerce": null, "user_data": null }` first (so the previous event's ecommerce object and hashed details never carry over to
the next event), then the event. A tag listens for the **event** entry. Event names are GA4's own. **Every event has an `event_id`.**

| Event | Fired by | GA4 | Meta pixel | has `user_data` |
| --- | --- | --- | --- | --- |
| `page_view` | Each page of a visit | yes | `PageView` | no |
| `view_item_list` | The shop, category, special prices and search pages when results load; a landing page once | yes | landing pages only: `ViewContent` | no |
| `view_item` | A product page opens | yes | `ViewContent` | no |
| `search` | The shop page opens with `?search=` | yes | no | no |
| `add_to_cart` | Add to cart | yes | `AddToCart` | no |
| `remove_from_cart` | A line is removed from the cart | yes | no | no |
| `view_cart` | The cart page, with something in it | yes | no | no |
| `begin_checkout` | The checkout opens with something in the cart | yes | `InitiateCheckout` | when known |
| `add_shipping_info` | Inside / Outside Dhaka is chosen | yes | no | no |
| `add_payment_info` | A payment method is chosen (or, if never touched, when the order is sent) | yes | `AddPaymentInfo` | when known |
| `purchase` | The order confirmation page, for a cash-on-delivery order | yes | `Purchase` | yes |
| `order_pending_payment` | The order confirmation page, for a bKash / Nagad / Rocket order | no | no | no |
| `anaiza_consent_changed` | GTM mode only: the visitor saved a cookie choice (no `event_id`: it is not a business event) | no | starts the pixel | no |

Direct mode also calls the TikTok pixel for the same events as Meta (and `CompletePayment` for the purchase). The shop has no TikTok pixel, so container version 2 has no TikTok tags.

**Item fields, on every event, in this order:** `item_id` (the SKU; a variant with its own SKU is reported by it; with no SKU, the product id as text), `item_name`, `price` (taka, a number,
the price actually charged), `quantity`, `item_category` (the category name; left out only for a cart saved before it was kept).

### `view_item_list`

| | |
| --- | --- |
| Trigger condition | Product results are on screen: each time the shop, a category, special prices or a search loads or changes page, sort or filter; a landing page once per visit, with its products |
| Parameters | `item_list_name` (the page's breadcrumb label, or `Landing page: <slug>`), `items[]`. Landing pages also send `currency` |

```json
{ "event": "view_item_list", "event_id": "view_item_list.8c1d52e7a0b34f96", "ecommerce": { "item_list_name": "Tea sets", "items": [
  { "item_id": "TEA-SET-4", "item_name": "Floral ceramic tea set for 4, with tray", "price": 4200, "quantity": 1, "item_category": "Tea sets" } ] } }
```

### `view_item`

| | |
| --- | --- |
| Trigger condition | A product page opens (once per product page, not again when the page refreshes its data in the background) |
| Parameters | `currency` "BDT", `value` (the price, a number), `items[]` with one item |

```json
{ "event": "view_item", "event_id": "view_item.5be1049fd2a7c386", "ecommerce": { "currency": "BDT", "value": 1850, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 1, "item_category": "Tea jars" } ] } }
```

### `search`

| | |
| --- | --- |
| Trigger condition | The shop page is opened with, or changed to, a search term (`/shop?search=tea`). Note: the empty-cart button "Shop tea sets" links to `?search=tea sets`, so it counts as a search |
| Parameters | `search_term` (trimmed text) |

```json
{ "event": "search", "event_id": "search.0a77c3e19d5b4268", "search_term": "tea set" }
```

### `add_to_cart`

| | |
| --- | --- |
| Trigger condition | Add to cart on a product page or card |
| Parameters | `currency`, `value` (price x quantity), `items[]` with one item and its `quantity` |

```json
{ "event": "add_to_cart", "event_id": "add_to_cart.d41f9e08a6c2573b", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] } }
```

### `remove_from_cart`

| | |
| --- | --- |
| Trigger condition | A line is removed from the cart (changing a quantity with the stepper is not reported) |
| Parameters | `currency`, `value` (price x quantity of the line), `items[]` with the line |

```json
{ "event": "remove_from_cart", "event_id": "remove_from_cart.91c4e2d7f08a3b65", "ecommerce": { "currency": "BDT", "value": 1850, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 1, "item_category": "Tea jars" } ] } }
```

### `view_cart`

| | |
| --- | --- |
| Trigger condition | The cart page, once per visit to it, after the saved cart has been read and has something in it |
| Parameters | `currency`, `value` (the cart's items total), `items[]` with every line |

```json
{ "event": "view_cart", "event_id": "view_cart.2e6b80f3c1d94a57", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] } }
```

### `begin_checkout`

| | |
| --- | --- |
| Trigger condition | The checkout page opens and the cart has something in it (once; it waits for the saved cart). In a landing page's order form: the first time the visitor touches the form |
| Parameters | `currency`, `value` (the items total, **without** delivery), `items[]` with every line. `user_data` when marketing is allowed and the page knows an email or phone (a signed-in customer, or what is already typed) |

```json
{ "event": "begin_checkout", "event_id": "begin_checkout.f7a2d96c0e13b845", "ecommerce": { "currency": "BDT", "value": 3700, "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] },
  "user_data": { "sha256_email_address": "<64 hex>", "sha256_phone_number": "<64 hex>", "external_id": "<64 hex>" } }
```

### `add_shipping_info`

| | |
| --- | --- |
| Trigger condition | The visitor chooses "Inside Dhaka" or "Outside Dhaka" (each choice) |
| Parameters | `currency`, `value` (items total), `shipping_tier` ("Inside Dhaka" or "Outside Dhaka"), `items[]` |

```json
{ "event": "add_shipping_info", "event_id": "add_shipping_info.6d03b7e4a915c28f", "ecommerce": { "currency": "BDT", "value": 3700, "shipping_tier": "Inside Dhaka", "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] } }
```

### `add_payment_info`

| | |
| --- | --- |
| Trigger condition | The visitor picks a payment method (each pick). If they never touched it (the first method was already chosen for them) it is sent once when they press Confirm order |
| Parameters | `currency`, `value` (items total), `payment_type` (`cod`, `bkash`, `nagad` or `rocket`), `items[]`. `user_data` as on `begin_checkout`: by now the typed email and phone are usually there |

```json
{ "event": "add_payment_info", "event_id": "add_payment_info.c85e1a29f6d0473b", "ecommerce": { "currency": "BDT", "value": 3700, "payment_type": "cod", "items": [
  { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] },
  "user_data": { "sha256_email_address": "<64 hex>", "sha256_phone_number": "<64 hex>", "external_id": "<64 hex>" } }
```

### `purchase`

| | |
| --- | --- |
| Trigger condition | The order confirmation page opens for a **cash-on-delivery** order that has not been reported in this browser tab before (section 4), after the order was placed |
| Parameters | `event_id` = `order-<order number>` (**outside** `ecommerce`), `ecommerce.transaction_id` (the order number, text), `ecommerce.value` (the **items total after discount, without delivery**, a number), `currency`, `shipping` (the delivery fee), `items[]`. With marketing allowed: `user_data` |

An order of two jars at 1,850 with delivery of 80 (total charged 3,780):

```json
{ "event": "purchase", "event_id": "order-1042",
  "ecommerce": { "transaction_id": "1042", "value": 3700, "currency": "BDT", "shipping": 80, "items": [
    { "item_id": "TEA-JAR-L", "item_name": "Lotus ceramic tea jar with wooden lid, 720 ml", "price": 1850, "quantity": 2, "item_category": "Tea jars" } ] },
  "user_data": { "sha256_email_address": "<64 hex>", "sha256_phone_number": "<64 hex>", "external_id": "<64 hex>" } }
```

Direct mode also calls `fbq('track','Purchase', {...}, { eventID: 'order-1042' })` and `ttq.track('CompletePayment', {...}, { event_id: 'order-1042' })`, with the same value.

### `order_pending_payment`

| | |
| --- | --- |
| Trigger condition | The order confirmation page for a bKash, Nagad or Rocket order: it is **not a sale yet** (the money must be matched and verified by the shop) |
| Parameters | `order_id`, `payment_type`, `event_id`. No value, no items, no buyer data, nothing a platform could read as a purchase |

```json
{ "event": "order_pending_payment", "event_id": "order_pending_payment.7f20c9a4e1b58d36", "order_id": "1043", "payment_type": "bkash" }
```

The sale for such an order reaches Meta and TikTok **from the shop's server only, when the shop verifies the payment** (and never reaches GA4).

### `anaiza_consent_changed` (GTM mode only)

| | |
| --- | --- |
| Trigger condition | The visitor saves a cookie choice (banner or footer "Cookie settings") |
| Parameters | `analytics_consent`, `marketing_consent`: `granted` or `denied` |

```json
{ "event": "anaiza_consent_changed", "analytics_consent": "granted", "marketing_consent": "granted" }
```

The container uses it to start the Meta pixel when marketing is allowed after the page was counted.

### Not sent, and not included

`select_item`, `select_promotion`, `view_promotion`, `add_to_wishlist`, `refund`, `login`, `sign_up`, `generate_lead`, a coupon (`coupon` is never pushed).
**Not included at all:** a Google Ads conversion tag, Enhanced Conversions (the hashed details are there, but no tag sends them to Google), TikTok (the shop has no pixel; direct mode still
supports one if an ID is saved), server-side GA4 for wallet orders (they have no browser purchase), and any change to the shop's own server sending (see "Value" below).

## 4. Purchase: once, the same id everywhere, and one value rule

- **Where it fires:** `src/app/order-confirmation/page.tsx`. The order is read from the browser tab (`sessionStorage`, the "last order" the checkout saved) and
  `trackPurchase(order)` runs once.
- **Not twice:** before it runs, the order number is looked up in `sessionStorage` under `anaiza-purchase-tracked`; if it is there nothing is sent, otherwise it
  is added first. A **reload, back/forward, or reopening the page in the same tab** therefore sends nothing. A different tab has no "last order", so shows "No recent
  order found" and sends nothing.
- **The ids:** `transaction_id` = the order number (`order.id`, text). `event_id` = `order-<order number>`, for example `order-1042`.
- **How the server gets the same id:** it does not need to be sent. Both sides derive it from the order's own id: the browser from `id` in the API's order response
  (`POST /api/orders` returns `data.id`, kept as the "last order"), the server from `$order->id` (`'event_id' => "order-{$order->id}"`, in `SendMetaConversionEvent` and
  `SendTikTokConversionEvent`). The server container gets it as the GA4 event's `event_id` parameter. Both use the event names `Purchase` (Meta) and `CompletePayment` (TikTok) on each
  side, which dedup needs (the same name and the same id, within 48 hours).
- **Server send:** the shop's own server sends at the moment a cash-on-delivery order is placed (right after the checkout response); for a wallet order, when an admin marks the payment
  verified. An order that is later cancelled is not reversed.

### Value

- **The rule (browser, and the server container):** `purchase.value` = the items total **after any discount, without the delivery fee and without tax** = the order's total minus its delivery fee.
  The delivery fee is in `ecommerce.shipping`. The Meta `Purchase` (browser tag, and the server container's) uses the same `value`, so GA4, Meta and the browser agree.
- **What the shop's own server sends today (`SendMetaConversionEvent`, `SendTikTokConversionEvent`):** `'value' => (float) $this->order->total`, which is the **total charged: items minus
  discount, plus delivery**. For an order of 3,700 of goods and 80 of delivery, the browser and the server container say 3,700 and the shop's server says 3,780. Meta keeps one of the two
  events when their ids match, so which value Meta shows can depend on which arrives first. **Decide:** change the shop's server to send `total - delivery_fee` (a backend change, not made here),
  or switch the shop's server Purchase off when the server container sends it.

### What each side sends about the buyer (all SHA-256, lower-case hex)

| Data | Browser data layer (`user_data`, only if marketing was allowed) | Server container forwards to Meta as | Shop's own server (Meta Conversions API) | Shop's own server (TikTok Events API) |
| --- | --- | --- | --- | --- |
| Email | `sha256_email_address` (trimmed, lower case) | `em` | `em` | `email` |
| Phone | `sha256_phone_number` (`8801XXXXXXXXX`: digits only, no plus) | `ph` | `ph` | `phone` |
| External id | `external_id` = hash of the customer id for a signed-in customer, else of the phone number | `external_id` | no | no |
| First / last name, city, region, country | not sent | not available | `fn`, `ln`, `ct`, `st`, `country` | no |
| Click ids | the Meta pixel reads its own cookies; the server container reads `_fbp` and `_fbc` | `fbp`, `fbc` | `fbc` (from the Facebook click id kept with the order) | `ttclid` |
| IP address, browser | the request itself | `client_ip_address`, `client_user_agent` | plain (as the platforms require) | plain |

`user_data` is on `begin_checkout`, `add_payment_info` and `purchase` only, and only when the page knows something to hash: a signed-in customer, or the email and phone already typed in the
form. Each field is left out when it is not usable (an invalid email, a number that is not a Bangladeshi mobile). If nothing is usable, there is no `user_data`.

Normalisation (browser and server agree): the email is trimmed and lower-cased; the phone is the 11-digit mobile number with the country code 880 (no zero, no plus); the external id is the customer
id as text, or that phone number.

## 5. Consent

- **The banner** (Admin > Cookie consent) has two modes. **Notice mode:** everything is allowed until the visitor chooses. **Opt-in mode:** analytics and marketing are
  denied until they choose. The banner offers Necessary (always on), Analytics and Marketing.
- **What is stored:** one first-party cookie, `anaiza_consent`, value `a<0|1>m<0|1>` (analytics, marketing), kept 12 months, `SameSite=Lax`, `Secure` on https.
- **Google Consent Mode v2:** when a GTM ID or a GA4 ID is set, a script in `<head>` sets `gtag('consent','default', ...)` **before any Google tag loads** with all four signals:
  `analytics_storage` follows the analytics choice, and `ad_storage`, `ad_user_data` and `ad_personalization` follow the marketing choice. With no saved choice: all
  `granted` in notice mode, all **`denied`** in opt-in mode (with `wait_for_update: 500` ms). When the visitor chooses, `gtag('consent','update', ...)` is sent at once.
  With the banner switched off everything is `granted`.
- **Hashed details need marketing consent:** `user_data` is neither computed nor pushed unless marketing is allowed at that moment.
- **Meta before consent (direct mode):** its queue is created so events are kept, but the pixel's file is not fetched, and nothing reaches Meta, until marketing is allowed.
  If the visitor allows it later, the file loads then and the kept events are sent. If they withdraw it, `fbq('consent','revoke')` is called.
- **Meta before consent (GTM mode):** nothing is loaded by the site. The container's pixel tags **require `ad_storage` to be granted**, so they do not run until marketing is allowed; then
  the `anaiza_consent_changed` event starts the pixel. Events that happened before the visitor allowed marketing are **not** replayed to Meta in this mode.
- **GA4 events and the server container:** the GA4 tags use Google's own consent handling, so with analytics denied GA4 sends cookieless pings (and the server container receives them with the
  consent state; its Meta tag must not send them: see `docs/server-container-guide.md`).
- **Server events and consent:** the checkout sends the shop's server `marketing_consent` (what the banner says at that moment). In opt-in mode a visitor who did not allow marketing is never sent
  by the shop's server. **In notice mode the shop's server sends the Purchase even if the visitor rejected cookies** (the mode's rule: notice, not consent). That is a policy choice, not a bug: ask a lawyer if unsure.

## 6. Customer-data rules

1. No raw email, phone number, name or address is pushed to the data layer or passed to a pixel, ever.
2. Hashed values (SHA-256, hex, normalised as above) are pushed only on `begin_checkout`, `add_payment_info` and `purchase`, and only when the visitor's choice allows marketing.
3. The hashed values are computed in the visitor's browser (`crypto.subtle`); a browser that cannot hash sends none.
4. Order numbers (`transaction_id`, `event_id`) and the random event ids are not personal data.
5. In the container, the hashes travel as the GA4 event parameters `sha256_email_address`, `sha256_phone_number` and `external_id`, so the server container can hand them to Meta. They should not be
   stored in GA4: the server container's GA4 tag is set not to forward them (`docs/server-container-guide.md`).

## 7. Checks that keep this true

- `src/lib/tracking.test.ts`: every event has its own `event_id`; the purchase uses `order-<id>` on every platform; the value rule; the item shape; the hashed details on the three events (normalisation, signed-in vs guest,
  nothing when marketing is not allowed, never a raw value); both modes (no `fbq` / `ttq` call in GTM mode); wallet orders are not revenue; page_view.
- `src/lib/userData.test.ts`: the normalisation and hashing of the email, the phone (`8801...`) and the external id.
- `src/lib/consent.test.ts`: GTM mode loads only GTM; direct mode still loads GA4, Meta and TikTok; Consent Mode defaults, updates and the late loading.
- `src/lib/gtmContainer.test.ts` and `gtmContainerV2.test.ts`: every event above has a trigger, every reference in the container files resolves, version 2 sends `event_id` on every GA4 and Meta tag.
