# Tracking setup guide (plain English)

For Tajin. You do not need to be a developer. Every step says where to click. The exact list of what the shop sends is in `docs/tracking-spec.md`; the file you import is
`docs/gtm-container-anaizanest.json`.

**What you are setting up (Phase 1):** Google Tag Manager (GTM) runs three browser tags for the shop: Google Analytics 4 (GA4), the Meta (Facebook) Pixel and the TikTok Pixel.
Behind them, the shop's own server also sends the **Purchase** to Meta and TikTok (Conversions API / Events API), with the same order id, so each platform counts a sale **once**.
The Stape server container is **not** used yet (Phase 2 is at the end).

**The one rule:** when a GTM Container ID is saved in Marketing Settings, GTM runs **all** the browser tags and the website loads none of them itself. With no GTM ID, the website
loads GA4, Meta and TikTok itself (the old way). So you never get a sale counted twice by the browser.

**IDs you already have (public, not secret):**

| What | Value |
| --- | --- |
| GA4 Measurement ID | `G-1V0Q6EN05B` |
| Web GTM container | `GTM-MS2HWSWF` |
| Server GTM container on Stape (Phase 2) | `GTM-MT7HFDG4` |
| Meta Pixel ID (already in Marketing Settings) | `956723840598016` |
| TikTok Pixel ID | you will copy it in step 1 |

**Order matters.** The website reads Marketing Settings **when it is built**, not live. So: put the IDs in (step 2), import and test the container (steps 3 to 5), publish the
container (step 6), and **rebuild and upload the website** so it starts using GTM. Until that rebuild, the website keeps loading the Meta pixel itself, exactly as today.

---

## 1. Find or create the IDs

1. **GA4:** analytics.google.com > Admin (gear, bottom left) > Data streams > click your web stream. The **Measurement ID** (starts with `G-`) is at the top right. While you are on this
   screen: click **Enhanced measurement** (the gear next to it), make sure **Page views** is on, click **Advanced settings** under it and make sure **Page changes based on browser history events**
   is ticked. (The shop does not reload the page when you click a link, so this is how GA4 sees each page.)
2. **GTM:** tagmanager.google.com > open the container whose ID is `GTM-MS2HWSWF` (the **web** one). Do not use `GTM-MT7HFDG4` here: that is the server container.
3. **Meta:** business.facebook.com > Events Manager > Data sources > your pixel. Write down:
   - the **Pixel ID** (a long number),
   - the **Conversions API access token**: Settings tab > Conversions API > **Generate access token** (it is shown once: copy it now),
   - the **Test event code**: the **Test events** tab, a code like `TEST12345`.
4. **TikTok:** ads.tiktok.com > Tools > Events > **Web events** > your pixel > **Manage** (or Settings):
   - the **Pixel ID** (letters and numbers, around 20 characters),
   - the **Events API access token**: Settings > **Generate Access Token** (copy it now),
   - the **Test event code**: the **Test events** tab.

## 2. Enter the IDs in the shop's Marketing Settings

Admin > **Marketing Settings**.

| Field in the admin | What to put |
| --- | --- |
| Google Tag Manager Container ID | `GTM-MS2HWSWF` |
| Google Analytics 4 ID | `G-1V0Q6EN05B` (kept for reference: with a GTM ID saved, the website does **not** load GA4 itself; the container does) |
| Meta Pixel ID | `956723840598016` |
| TikTok Pixel ID | your TikTok pixel ID |
| Meta Conversions API Access Token | paste the token. It is **write-only**: after saving you only see "Saved (ends in ••••1234)". Leave blank to keep it. The bin icon clears it |
| TikTok Events API Access Token | the same |
| Meta test event code | `TEST12345` style code, **only while testing** |
| TikTok test event code | the same |

Press **Save**. (Tokens are secret: never put them in the container, in a message or in a document.) Remember: nothing changes on the website until it is rebuilt (end of step 6).

## 3. Import the container and set the three IDs

1. tagmanager.google.com > the web container > **Admin** (top) > **Import Container**.
2. **Choose container file:** `docs/gtm-container-anaizanest.json`.
3. **Choose workspace:** *New* > name it `Anaiza setup`. (Do not import into Default if other people use it.)
4. **Import option:** *Merge*, then *Rename conflicting tags, triggers, variables*. **Confirm**.
5. You now have 18 new tags, 14 triggers and 18 variables, all starting with `AN - `. Open **Variables** > *User-defined variables* and edit the four constants:
   - `AN - GA4 Measurement ID`: already `G-1V0Q6EN05B`. Check it.
   - `AN - Meta Pixel ID`: already `956723840598016`. Check it.
   - `AN - TikTok Pixel ID`: **replace `REPLACE_WITH_TIKTOK_PIXEL_ID` with your TikTok pixel ID.** Until you do, TikTok does nothing.
   - `AN - Server URL`: **leave it as `NONE`** (Phase 2 only). GTM does not keep a constant with nothing in it, so `NONE` is how this one says "empty": while it is not an `https://` address, the Google tag sends nothing to a server container.
6. Do not touch the other variables or any trigger.

What the tags are (so you know what you are looking at):

| Tag | Fires on | Notes |
| --- | --- | --- |
| `AN - Google tag (GA4)` | Initialization, once per page | Loads GA4 and counts the page views |
| `AN - GA4 - ecommerce and search events` | The ten GA4 events | **One tag** sends every GA4 event under its own name (`{{Event}}`) with the shop's ecommerce data: one place to look, the ten cannot drift apart |
| `AN - Meta Pixel - ...` (8 tags) | Page view, page change, product view, landing page view, add to cart, checkout, payment info, **Purchase** | Custom HTML tags: GTM's template gallery is not part of an import file, so these use Meta's standard `fbq` code |
| `AN - TikTok Pixel - ...` (8 tags) | the same, ending with **CompletePayment** | Custom HTML tags with TikTok's standard `ttq` code |

**Consent is built in.** The two GA4 tags use Google's own consent handling (they respect `analytics_storage`). Every Meta and TikTok tag is set to need **`ad_storage`** granted before it fires.
If you open a tag > *Advanced settings* > *Consent settings* you will see this. Nothing to do.

**Manual steps that cannot be in an import file:** (a) the GA4 Enhanced measurement settings in step 1; (b) typing the TikTok pixel ID in step 3; (c) in GTM > Admin > Container settings,
nothing needs changing; Consent Overview is optional.

### 3a. Read this before you publish: the container already has nine tags

The export of your container (`docs/gtm-export-empty.json`) is **not empty**. It already holds a set of tags, made with Stape's Facebook template and GA4 tags, on the same events as ours:

| Existing tag (type) | Fires on |
| --- | --- |
| `GA4 Configuration Tag` (Google tag) | Initialization - All Pages. It sends GA4 to **`https://ywzcczvd.usv.stape.io`** (a Stape server container) and sets `send_page_view` to false |
| `GA4 Page_view Tag`, `FB page_view Tag` | All Pages |
| `GA4 view_item Tag`, `FB ViewContent Tag` | the `view_item` event (trigger `view_item - Trigger`) |
| `GA4 begin_checkout Tag`, `FB InitiateCheckout Tag` | the `begin_checkout` event |
| `GA4 purchase Tag`, `FB Purchase Tag` | the `purchase` event |

They read data layer names this shop does not push (`content id`, `Total Value`, `User Email`, ...), so what they would send is mostly empty, and **if you leave them active beside ours, every one of those events is counted twice** (two GA4 purchases, two Facebook purchases), and GA4 is configured twice.
**Before you Publish, in the workspace: pause or delete those nine tags** (click the tag > the three dots > *Pause*; or select them and delete). Do not delete the *variables* or *templates*: nothing else uses them and they do no harm. If you would rather keep the Stape tags and drop ours, say so: the data layer would then need to be changed to match their names.

Their GA4 tag sends to a **server container**. Phase 1 in this guide does not use one, so our Google tag sends GA4 straight from the browser (`AN - Server URL` = `NONE`).

### 3b. If GTM says "File format is invalid"

1. Run `npm run gtm:validate` in the storefront folder: it checks every file against the shapes in your real export and says what it finds. (It was written without being able to try an import in GTM: it cannot promise GTM accepts the file.)
2. Find the failing part. Import **in this order**, each with *Merge* and *Rename conflicting*, into the **same new workspace** (each file is a whole export that holds only its part; the triggers a tag needs are repeated in its file, so a part can be imported alone once 01 is in):

| Order | File (in `docs/gtm/`) | Holds |
| --- | --- | --- |
| 1 | `01-variables.json` | the constants, the Custom JavaScript variable, the Data Layer variables, the built-in variables |
| 2 | `02-triggers.json` | the 14 Custom Event triggers (they refer to variables by name, so 01 first) |
| 3 | `03-tags-ga4.json` | the Google tag and the one GA4 events tag |
| 4 | `04-tags-meta.json` | the 8 Meta tags |
| 5 | `05-tags-tiktok.json` | the 8 TikTok tags |

3. The first file GTM refuses is where to look. If **04 or 05** is refused, try `04-tags-meta.no-consent.json` / `05-tags-tiktok.no-consent.json` (the same tags with no consent requirement: the consent setting is the one thing in our files that your export has no example of). If those import, add the consent by hand: tag > *Advanced settings* > *Consent settings* > *Require additional consent for tag to fire* > `ad_storage`.
4. If nothing imports, build by hand with `docs/gtm-manual-build.md`: every variable, trigger and tag as tables with the code to paste.

## 4. Test, one tool at a time

Test on the new shop (the staging address, or the live one after the rebuild), in a normal Chrome window.

### 4.1 GTM Preview (Tag Assistant)

1. In GTM press **Preview** (top right), type the shop address, **Connect**. The shop opens in a new tab with a small "Connected" badge.
2. Do each action below on the shop. In the Tag Assistant tab, click the matching event on the left and check the **Tags Fired** list.

| You do this | Event to see on the left | Tags that must say **Fired** |
| --- | --- | --- |
| Open any page | Initialization / Page View | `AN - Google tag (GA4)`, `AN - Meta Pixel - base + PageView`, `AN - TikTok Pixel - base + page` |
| Click to another page | `page_view` | `AN - Meta Pixel - PageView (page change)`, `AN - TikTok Pixel - page (page change)` |
| Open a product | `view_item` | `AN - GA4 - ecommerce and search events`, `AN - Meta Pixel - ViewContent (product)`, `AN - TikTok Pixel - ViewContent (product)` |
| Open the Shop page | `view_item_list` | the GA4 events tag only (Meta and TikTok only get this for landing pages) |
| Search in the header | `search` | the GA4 events tag |
| Add to cart | `add_to_cart` | GA4 events tag, `AN - Meta Pixel - AddToCart`, `AN - TikTok Pixel - AddToCart` |
| Open the cart | `view_cart` | GA4 events tag |
| Remove a line | `remove_from_cart` | GA4 events tag |
| Open the checkout | `begin_checkout` | GA4 events tag, `... InitiateCheckout` (Meta and TikTok) |
| Choose Inside / Outside Dhaka | `add_shipping_info` | GA4 events tag |
| Choose a payment method | `add_payment_info` | GA4 events tag, `... AddPaymentInfo` (Meta and TikTok) |
| Place a **cash on delivery** order | `purchase` (on the confirmation page) | GA4 events tag, `AN - Meta Pixel - Purchase`, `AN - TikTok Pixel - CompletePayment (purchase)` |

3. Click the `purchase` event > **Data Layer** tab: you should see `event_id: "order-<number>"` and `ecommerce` with `transaction_id`, `value`, `currency: "BDT"`, `shipping` and `items`.
4. If the cookie banner is in *opt-in* mode, a Meta or TikTok tag shows **Not fired: consent**. That is correct until you press Accept; after you do, you will see the `anaiza_consent_changed` event
   and the base tags fire.

### 4.2 GA4 DebugView

1. analytics.google.com > Admin > **DebugView** (under Data display). Keep the Tag Assistant window connected: that is what makes your visit show up here.
2. Repeat the actions above. Each event appears in the middle column within a few seconds. Click `purchase` and check the parameters (step 5).

### 4.3 Meta: Pixel Helper and Test events

1. Install **Meta Pixel Helper** (Chrome extension). On the shop it shows `956723840598016` and lists `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase` as you go.
   Green is good; a warning about "pixel fired twice" means something is wrong (see Troubleshooting).
2. Events Manager > Data sources > your pixel > **Test events** > *Test browser events*: enter the shop address, open it, and do a cash-on-delivery order.
3. Make sure the **Meta test event code** is saved in Marketing Settings (step 2). The shop's server will send its Purchase with that code.
4. In Test events you should see `Purchase` **twice**: one *Browser*, one *Server*. After a minute the pair shows **Deduplicated** (or "Processed"): that is the proof the sale is counted once.
   Both must show the same **Event ID**, `order-<number>`.

### 4.4 TikTok: Pixel Helper and Test events

1. Install **TikTok Pixel Helper** (Chrome extension). It lists `Pageview`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `CompletePayment`.
2. TikTok Events Manager > your pixel > **Test events**: choose browser events, enter the shop address and do an order. With the **TikTok test event code** saved, the server's `CompletePayment` shows
   there too; the browser and server events with the same `event_id` are merged.

## 5. Test purchase checklist

Place one real cash-on-delivery order for a known product (you can cancel it afterwards), write down the order, then check that the **same numbers** show everywhere:

| Check | Admin order | GA4 (DebugView `purchase`) | Meta (Test events > Purchase) | TikTok (Test events > CompletePayment) |
| --- | --- | --- | --- | --- |
| Order number | Order # (for example 1042) | `transaction_id` = 1042 | Event ID = `order-1042` | Event ID = `order-1042` |
| Value | **Total** (items + delivery) | `value` = Total | Value = Total | Value = Total |
| Currency | taka | `currency` = BDT | BDT | BDT |
| Delivery | Delivery fee | `shipping` = the fee | n/a | n/a |
| Products | each product's **SKU** (Admin > Products) | `items[].item_id` = SKU, with `quantity` and `price` | `content_ids` = the SKUs | `content_id` = the SKUs |

Also check there is **one** purchase per platform: one in GA4, one merged Meta event, one merged TikTok event. Reload the confirmation page: **nothing new** may appear (the shop sends it once per order).

Wallet orders (bKash, Nagad, Rocket) are **not** a sale at checkout. The browser sends only `order_pending_payment`; Meta and TikTok get the Purchase from the shop's **server** when you mark the
payment verified in the admin. GA4 never gets it (no server-side GA4 yet).

## 6. Publish, tidy up, rebuild

1. In GTM press **Submit** (top right) > Version name `Phase 1` > **Publish**.
2. Marketing Settings: **clear the Meta test event code and the TikTok test event code** (empty the fields and Save). While a code is saved, real sales are marked as tests and do not count.
3. Make sure the **TikTok Pixel ID** constant in the container is real (step 3).
4. Ask for the **website to be rebuilt and uploaded** so that it starts using GTM (the build reads the saved GTM ID). Until then the website still loads the Meta pixel itself.
5. After the upload: open the shop, press Preview again and confirm the **Meta pixel loads only through GTM**: Meta Pixel Helper must show **one** pixel (`956723840598016`), not two.

## 7. Troubleshooting

| Problem | Likely cause | What to do |
| --- | --- | --- |
| An event is missing in GA4 | Tag did not fire, or ad blocker / consent | Tag Assistant: did `AN - GA4 - ecommerce and search events` fire? If not, check the event is in the left list. If the cookie banner is in opt-in mode and you rejected analytics, GA4 sends only anonymous pings |
| The Meta or TikTok event says "not fired: consent" | The visitor has not allowed marketing | Press Accept on the banner and try again. This is correct behaviour |
| Meta Pixel Helper shows the pixel twice, or every event is doubled | The site is still loading the pixel itself **and** GTM does | The website was built before the GTM ID was saved or before the fix. Rebuild and upload; check Marketing Settings has the GTM ID |
| Purchase counted twice in Meta | Browser and server have different event ids, or the **test event code** is still set | Look at Test events: both must have Event ID `order-<number>`. Clear the test code (step 6). Do not add a second server sender (see Phase 2) |
| Purchase missing in GA4 for a bKash order | Expected | Wallet orders are not a sale until verified; GA4 has no server-side purchase yet |
| Wrong value | The `value` is the order **total** (delivery included) | Compare with the admin Total. `begin_checkout` and `add_payment_info` use the items total without delivery, on purpose |
| Item ids look like numbers, not SKUs | The product has no SKU in the admin | Add a SKU to the product (Admin > Products). With no SKU the product id is used |
| No server event in Meta Test events | The Conversions API token or Pixel ID is missing, or the order was placed in opt-in mode without marketing consent | Marketing Settings: tokens must show "Saved". Check the order is cash on delivery. Check Admin > System health for a failed send |
| No server event in TikTok | Same, for the TikTok token | The same checks. TikTok can take a few minutes to show test events |
| GA4 page views are missing after clicking around | Enhanced measurement history changes is off | Step 1, point 1 |
| Page views are doubled in GA4 | Both the website and GTM load GA4 | Marketing Settings must have a GTM ID (then the site never loads GA4 itself). Also remove any other GA4 tag you added by hand in the container |
| `search` fires when nobody searched | The empty-cart "Shop tea sets" button opens `?search=tea sets` | Known and small. Ignore, or filter that term in GA4 |

**Not included in Phase 1:** a Google Ads conversion tag, Google Ads / GA4 Enhanced Conversions (the hashed `user_data` is in the data layer, ready, but no tag uses it), server-side GA4,
the Stape server container, a coupon parameter, `select_item` / `view_promotion` / `add_to_wishlist`, and a server-side Purchase for GA4.

---

## Phase 2: Stape server container (documentation only, not built yet)

The server container `GTM-MT7HFDG4` on Stape is **not used** in Phase 1. When you are ready, here is how it fits. Nothing in the website or in the web container has to change except **one value**.

### The flow

```
Browser (the shop)
   |  data layer events
   v
Web container GTM-MS2HWSWF  --(GA4 tag, transport_url = your Stape address)-->  Server container GTM-MT7HFDG4 (Stape, first-party domain)
                                                                                      |  GA4 client receives the request
                                                                                      +--> GA4 tag: forwards to Google Analytics
                                                                                      +--> (optional) Meta / TikTok tags for non-purchase events
Shop's Laravel server ------------------------------------------------------------>  Meta Conversions API, TikTok Events API  (Purchase / CompletePayment, as today)
```

- To switch the GA4 stream through Stape you fill **one variable**: in the web container set `AN - Server URL` to your Stape address (for example `https://sgtm.anaizanest.com`).
  The Google tag then adds `server_container_url`; nothing else changes. Set it back to `NONE` to go back.
- **Which events the server container must receive** (the same GA4 events the web tag sends): `page_view`, `view_item_list`, `view_item`, `search`, `add_to_cart`, `remove_from_cart`, `view_cart`,
  `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`. In the server container, add a **GA4 client**, and a **GA4 tag** that forwards each to your GA4 property.
  (`order_pending_payment` and `anaiza_consent_changed` never reach the server container: they are not GA4 events.)

### Who sends the Purchase to Meta and TikTok: pick ONE, never both

If both the shop's Laravel server and the Stape container send a Purchase to Meta (or TikTok) with the same `event_id`, Meta merges them, but with a different id or a missed id you get double sales. So there is exactly one rule:

- **Option A (recommended, and how it works today): Laravel sends the Purchase and CompletePayment.** In the Stape container, do **not** add a Meta Conversions API tag or TikTok Events API tag for
  purchase events. You may add them for **other** events only (for example `AddToCart`), never for `purchase`. Nothing to switch.
  This is the right choice because Laravel also covers **bKash / Nagad / Rocket** sales, which the browser never sees (they are sent when you verify the payment). A Stape container cannot see those.
- **Option B: Stape sends them.** Add the Meta Conversions API and TikTok Events API tags in the Stape container on the `purchase` event, using the event id `order-<transaction_id>` (the same pattern), **and
  turn Laravel off**: Admin > Marketing Settings > click the **bin icon** next to *Meta Conversions API Access Token* and *TikTok Events API Access Token* (Laravel sends only when a token is saved).
  Cost: wallet orders are then no longer sent to Meta and TikTok at all. To go back to A: paste the tokens again and remove the purchase tags from Stape.
  Before B you must also ask for the GA4 events tag to carry the id (`event_id` as an event parameter): it is not sent to GA4 today.

**Switching rule in one line:** only one of {Laravel tokens saved, Stape purchase tags enabled} may be on for a given platform.

### The first-party domain (so the cookies last and ad blockers matter less)

1. Pick an address under your own domain, for example `sgtm.anaizanest.com` (a subdomain of the shop, so the browser treats it as first-party).
2. Stape: open the container `GTM-MT7HFDG4` in your Stape account > **Settings** > **Custom domains** (Tagging server URL) > add `sgtm.anaizanest.com`.
3. Stape then shows **the exact DNS records** to create (normally an **A record** and an **AAAA record**, or a **CNAME**, for that subdomain). Copy them **exactly as shown**.
4. In Hostinger: hPanel > Domains > anaizanest.com > **DNS / Nameservers** > DNS records > add each record Stape gave you, with the name `sgtm`. Do **not** change or delete the records for `@`, `www` or `api`.
5. Back in Stape press **Verify**. The address is ready when it shows a green tick and an SSL certificate (this can take from minutes to a few hours). If you use Cloudflare, switch the proxy (orange cloud) off for this record unless Stape says otherwise.
6. In the web container, set the variable `AN - Server URL` to `https://sgtm.anaizanest.com` (no slash at the end), publish.
7. Content Security Policy: the shop's `.htaccess` has a CSP that only **reports** for now. When you turn it on, add `https://sgtm.anaizanest.com` to `connect-src` (and to `script-src` if the container script is loaded from it).

### What to test in Phase 2

1. Web container Preview and the Stape **server container Preview**, side by side: each GA4 event the browser sends shows up as a request in the server preview, and the GA4 tag there says **Fired**.
2. GA4 DebugView still shows every event, **once** (not twice: it must not also arrive straight from the browser; with `AN - Server URL` filled in, the Google tag sends through the server only).
3. The Purchase: GA4 shows one `purchase`; Meta Test events shows one merged Purchase (Browser + Server, "Deduplicated"); TikTok the same. No second server copy.
4. The first-party cookie: in Chrome DevTools > Application > Cookies, the GA cookie is set by the shop's domain.
5. Set `AN - Server URL` back to `NONE`, publish, and confirm everything returns to the Phase 1 behaviour.
