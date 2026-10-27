# Server container guide (Stape, GTM-MT7HFDG4)

For Tajin. Plain English, in order. Nothing here needs code. **Never paste a token, a key or a password into a chat, a document or an email**: you type them only into the Stape or GTM screen named in the step.

**What this does.** Today the shop's browser tags send GA4 and Meta events straight from the visitor's phone. After this guide, the GA4 events go to **your server container** first (on Stape, at your own address). The server container passes them on to GA4 and, for six of them, to Meta's Conversions API.
Because the phone and the server container send the **same event with the same `event_id`**, Meta counts each action **once** ("Deduplicated" in Events Manager).

```
Visitor's browser
   |  the shop pushes events with an event_id into the data layer
   v
Web container GTM-MS2HWSWF  -- Meta pixel tags (eventID = the event_id) --------------------------> Meta (browser event)
   |  GA4 tags (event_id, hashed email/phone if allowed), server_container_url = AN - Server URL
   v
Server container GTM-MT7HFDG4 (Stape, your own address)
   |-- GA4 tag ----------------------------------------------------------------------------------> Google Analytics
   |-- Meta Conversions API tag (6 events, same event_id) ---------------------------------------> Meta (server event)

The shop's own server (Laravel) --- Purchase, same event_id (order-<number>) -------------------------> Meta   (stays on while you switch over)
```

**What you need before you start:** access to Stape (the container `GTM-MT7HFDG4`), to the web container `GTM-MS2HWSWF`, to Hostinger (the DNS of `anaizanest.com`), to Meta Events Manager, and to GA4. Plan about two hours. Do the steps **in order**.

---

## 0. Before anything: back up the web container, and one GA4 setting

1. tagmanager.google.com > the **web** container `GTM-MS2HWSWF` > **Admin** > **Export Container** > choose the **Live** version (or the current workspace if you have unpublished changes you want to keep) > **Export**. Save the file somewhere safe. It is your way back.
2. analytics.google.com > Admin > Data streams > your web stream > **Enhanced measurement** (the gear) > **Page views** > **Advanced settings** > **untick "Page changes based on browser history events"**. From now on the shop sends every page view itself, with an `event_id`; leaving this on would count each page change twice.

## 1. A custom domain for the server container (Stape and Hostinger)

A server container works on Stape's own address (today `https://ywzcczvd.usv.stape.io`), but an address on **your own domain** (for example `https://metrics.anaizanest.com`) is better: browsers trust it more, and ad blockers are less likely to stop it. You can do the rest of this guide on Stape's address and add the custom domain later; the only thing that changes is one value in the web container (step 3).

1. **Stape:** open your account > the container `GTM-MT7HFDG4` > its **Settings** (or the **Custom domains** tab) > **Add custom domain** (or "Tagging server URL") > type the address you chose, for example `metrics.anaizanest.com`.
2. **Stape shows you the DNS records to create.** The exact records depend on Stape and can change, so copy what the screen shows. They are normally **an A record and an AAAA record** (or a **CNAME**) for that name. Each record has a **Type**, a **Name/Host** (for example `metrics`) and a **Value/Points to**.
3. **Hostinger:** hPanel > **Domains** > `anaizanest.com` > **DNS / Nameservers** > **DNS records** (the DNS zone) > **Add record**, once for each record Stape gave you. Type the **Name** and **Value** exactly as Stape shows them. Leave the TTL as it is. **Do not change or delete** the existing records for `@`, `www` or `api`.
4. **Back in Stape**, press **Verify** (or wait; it checks by itself). The domain is ready when it shows **Connected** (a green tick) and an SSL certificate is issued. This can take a few minutes to a few hours. If it stays red after an hour, check each value for typos, and that you did not put the full domain in the Name box (the Name is just `metrics`).
5. Check it in a browser: open `https://metrics.anaizanest.com/healthy` (Stape's health address; if that gives "not found", ask Stape support what the check address is). A short "OK" or similar means it is alive.

**Where the address is kept.** The shop's **Marketing Settings do not have a field for the server container's address**, so there is nothing to change in the admin and **no storefront rebuild or upload is needed**. The address lives in **one place only**: the constant `AN - Server URL` in the web container (step 3). Changing it needs only a GTM publish. (The shop's pages are not involved at all: the browser tags in GTM read it.)

*Later, before you turn on the shop's strict security policy:* the shop's `.htaccess` has a Content-Security-Policy that only **reports** for now. When it is switched to enforcing, add your server address (`https://metrics.anaizanest.com`) to its `connect-src` list.

## 2. The web container, version 2

File: `docs/gtm-container-anaizanest-v2.json`. It replaces the first version (`docs/gtm-container-anaizanest.json`, which you already imported).

What is different: GA4 events carry the `event_id` and, when the shop pushed them, the hashed email, phone and external id; every Meta tag sends `eventID` = the `event_id`; the Google tag can send through the server container; **TikTok is gone** (you have no TikTok pixel); one Meta PageView tag now covers the first page and every page change.

1. In GTM (web container) press **Workspace** > make a **new workspace**: Workspaces (top left) > the **+** > name it `Server v2`.
2. **Admin** > **Import Container** > **Choose container file** > `gtm-container-anaizanest-v2.json`.
3. **Choose workspace:** *Existing* > `Server v2`. **Do not choose "Overwrite" for the whole container**: that would delete anything you changed yourself. (You made the backup in step 0, but there is no need to risk it.)
4. **Import option:** *Merge*, then **Overwrite conflicting tags, triggers, and variables**. This replaces the `AN - ...` items from version 1 with their new versions (same names) and leaves everything else alone. **Confirm**.
5. **Delete what version 2 no longer has** (an import cannot delete). In the workspace:
   - Tags: `AN - Meta Pixel - base + PageView`, `AN - Meta Pixel - PageView (page change)`, `AN - GA4 - ecommerce and search events`, and all eight tags starting `AN - TikTok Pixel - ...`.
   - Variable: `AN - TikTok Pixel ID`, `AN - DLV user_data`, `AN - DLV meta_user_data`.
   - (If you already paused or deleted the nine older tags that were in the container before our first import, nothing more to do. If any of them is still active, pause it: it would count everything twice.)
6. Open the variable `AN - Server URL`. It says **`NONE`**: leave it for now. **NONE means "send GA4 straight to Google, not through the server container".**
7. Press **Preview**, open the shop, and check in Tag Assistant: on any page you should see a `page_view` event and the tags `AN - Google tag (GA4)`, `AN - GA4 - page_view` and `AN - Meta Pixel - init + PageView` fire. Do **not publish yet**: the server container must exist first (steps 3 to 6).

## 3. The server container: the GA4 client

In Stape or in GTM (tagmanager.google.com > the **server** container `GTM-MT7HFDG4`): the left menu is **Clients, Tags, Triggers, Variables, Templates**. The "Workspace changes" counter shows what is unpublished.

1. **Clients.** You should see a client of type **Google Analytics: GA4 (Web)** (often named "GA4"). If the list is empty, press **New** > choose **Google Analytics: GA4 (Web)** > leave its settings as they are > **Save**. This client is what receives the browser's GA4 events and turns them into events the tags can use.

## 4. The server container: variables

**Variables** > **New** > pick the type named in the table (they are all of the type **Event Data**) > type the **Key Path** > name it exactly > **Save**. The names are a suggestion that the other steps use; stick to them.

| Name | Type | Key Path | What it is |
| --- | --- | --- | --- |
| `AN - ED event_id` | Event Data | `event_id` | The event's own id (the same one the phone sent to Meta) |
| `AN - ED value` | Event Data | `value` | The value of the event, in taka (a purchase: items after discount, without delivery) |
| `AN - ED currency` | Event Data | `currency` | BDT |
| `AN - ED transaction_id` | Event Data | `transaction_id` | The order number (purchase only) |
| `AN - ED items` | Event Data | `items` | The products: `item_id` (the SKU), `item_name`, `price`, `quantity`, `item_category` |
| `AN - ED page_location` | Event Data | `page_location` | The address of the page (becomes Meta's "event source URL") |
| `AN - ED email hash` | Event Data | `sha256_email_address` | The buyer's email, already hashed (only when the visitor allowed marketing and it is known) |
| `AN - ED phone hash` | Event Data | `sha256_phone_number` | The phone, already hashed, as 8801XXXXXXXXX |
| `AN - ED external id` | Event Data | `external_id` | Hash of the customer id, or of the phone for a guest |

Then two more:

- **`AN - Meta event name`**, type **Lookup Table** (or "Event Name" lookup): *Input variable* = the built-in **Event Name**. Rows (input => output): `page_view` => `PageView`; `view_item` => `ViewContent`; `add_to_cart` => `AddToCart`; `begin_checkout` => `InitiateCheckout`; `add_payment_info` => `AddPaymentInfo`; `purchase` => `Purchase`. No default value (leave it empty).
- **`AN - Meta content_ids`**, type **Custom JavaScript**, only needed if the Meta tag does not fill `content_ids` from the items by itself (see step 6). Code:

```js
function () {
  var items = {{AN - ED items}} || [];
  var ids = [];
  for (var i = 0; i < items.length; i++) { if (items[i] && items[i].item_id) { ids.push(items[i].item_id); } }
  return ids;
}
```

## 5. The server container: triggers

**Triggers** > **New** > *Trigger type*: **Custom** > *This trigger fires on*: **Some events** > the condition **Event Name** **equals** the name in the table. Name the trigger as shown.

| Trigger name | Event Name equals |
| --- | --- |
| `AN - Server - page_view` | `page_view` |
| `AN - Server - view_item` | `view_item` |
| `AN - Server - add_to_cart` | `add_to_cart` |
| `AN - Server - begin_checkout` | `begin_checkout` |
| `AN - Server - add_payment_info` | `add_payment_info` |
| `AN - Server - purchase` | `purchase` |
| `AN - Server - all GA4 events` | *Client Name* **equals** `GA4` (the name of your GA4 client), instead of an event name |

**Meta does not get** `remove_from_cart`, `view_cart`, `view_item_list`, `search` or `add_shipping_info`: there is no trigger for them above, so the Meta tag never fires on them. (GA4 gets all of them.)

## 6. The server container: tags

### 6a. The GA4 tag

**Tags** > **New** > *Tag type*: **Google Analytics: GA4**. 
- *Measurement ID*: `G-1V0Q6EN05B`.
- *Event name*: leave the default (it uses the incoming event's name).
- *Triggering*: `AN - Server - all GA4 events`.
- **Do not store the hashed contact details in GA4.** In the tag's **Event Parameters** section, use *Remove parameter* (the option may be labelled "Parameters to remove" or similar) and list `sha256_email_address`, `sha256_phone_number`, `external_id`. They are only for Meta.
- Name it `AN - Server - GA4` > **Save**.

### 6b. The Meta Conversions API tag

1. **Templates** > **Tag Templates** > **Search Gallery** > search for **Facebook Conversion API** (the template by **Stape**) > **Add to workspace**. (This tag is a template from the gallery, so it cannot come from an import file: it is a manual step.)
2. **Tags** > **New** > *Tag type*: the **Facebook Conversion API** template you just added. Fill it in. The labels may differ a little by version; the meaning of each is given.

| Field (meaning) | Value |
| --- | --- |
| Pixel ID | `956723840598016` |
| API Access Token | **You** paste it here, from Meta Events Manager > your dataset/pixel > **Settings** > **Conversions API** > **Generate access token**. It is shown once. Never send it to anyone, never put it in a document |
| Test event code | While testing only: the code from Events Manager > **Test events** (like `TEST12345`). **Remove it when you finish (step 9)** |
| Event name | Choose to set it yourself ("Override"/"Custom"), value `{{AN - Meta event name}}` |
| Event ID | `{{AN - ED event_id}}` |
| Action source | `website` |
| Event source URL | `{{AN - ED page_location}}` |
| User data: email | `{{AN - ED email hash}}`. It is already a SHA-256 hash; the template should not hash it again (a 64-character hexadecimal text is recognised as hashed). **Check this in Preview** (step 7): the value sent to Meta must equal the one in the incoming event |
| User data: phone | `{{AN - ED phone hash}}` |
| User data: external id | `{{AN - ED external id}}` |
| fbp / fbc (browser cookies) | Leave the default: the template reads the `_fbp` and `_fbc` cookies of the visit by itself |
| IP address, user agent | Leave the default: they come from the visitor's request |
| Custom data: value | `{{AN - ED value}}` |
| Custom data: currency | `{{AN - ED currency}}` |
| Custom data: order id (`order_id`) | `{{AN - ED transaction_id}}` |
| Custom data: content_type | `product` |
| Custom data: content_ids | The SKUs of the items. If the template has a switch that fills this from the GA4 `items` by itself, use it; otherwise `{{AN - Meta content_ids}}` |
| Triggering | the six triggers `AN - Server - page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase` (click the triggering box and tick all six) |

- **Consent:** if the tag has *Advanced settings* > *Consent settings* (or a "respect consent" switch), require **`ad_storage`** to be granted, like the browser's Meta tags. A visitor who refused marketing must not be sent to Meta.
- Name it `AN - Server - Meta Conversions API` > **Save**.

| GA4 / data layer event | Meta event | Sent to Meta |
| --- | --- | --- |
| `page_view` | `PageView` | yes |
| `view_item` | `ViewContent` | yes |
| `add_to_cart` | `AddToCart` | yes |
| `begin_checkout` | `InitiateCheckout` | yes |
| `add_payment_info` | `AddPaymentInfo` | yes |
| `purchase` | `Purchase` | yes |
| `view_item_list`, `search`, `view_cart`, `remove_from_cart`, `add_shipping_info` | none | **no** |

## 7. Test, in this order

First tell the web container to use the server container, in preview only:

1. Web container > the workspace `Server v2` > Variables > `AN - Server URL` > replace `NONE` with your server address, **with `https://` and no slash at the end** (for example `https://metrics.anaizanest.com`, or Stape's own address while the domain is not connected yet). Save. Do not publish.
2. Server container > **Preview** (top right). A debugger window opens; keep it open.
3. Web container > **Preview** > enter the shop's address > Connect.
4. Meta Events Manager > your dataset > **Test events** > copy the **test event code** > paste it into the Meta tag's *Test event code* field in the server container, and into **Marketing Settings > Meta test event code** in the shop admin (so the shop's own server Purchase shows up in the same test). Save both.
5. In Meta's Test events, choose **"Test browser events"** and enter the shop's address, so both the browser and the server events show.

Now do each action on the shop and check the server preview (the incoming request is a GA4 request; the Meta tag must say **Fired**). **In this order:**

| # | You do | Meta event that must appear in Test events | Both rows? |
| --- | --- | --- | --- |
| 1 | Open any page | `PageView` | one **Browser** row and one **Server** row, status **Deduplicated** |
| 2 | Open a product | `ViewContent` | Browser + Server, Deduplicated |
| 3 | Add it to the cart | `AddToCart` | Browser + Server, Deduplicated |
| 4 | Open the checkout | `InitiateCheckout` | Browser + Server, Deduplicated |
| 5 | Choose a payment method | `AddPaymentInfo` | Browser + Server, Deduplicated |
| 6 | Place a cash-on-delivery order | `Purchase` | Browser + Server, Deduplicated (the shop's own server also sends one with the same id: it merges into the same row) |

Click a row to check: the **Event ID** must be the same in the Browser and the Server row (for a purchase `order-<number>`), and the **value** is the items total without delivery.

**If only one row shows** (Browser or Server):
- *Only Browser:* the server container did not send. In the server preview, did the request arrive (a request appears for each action)? If not, the web container's `AN - Server URL` is wrong or still `NONE`, or the GA4 tag is blocked by consent. If it arrived but the Meta tag did not fire, check the trigger for that event and the consent setting. If it fired, open the tag's details in the preview: Meta's error text is there (a wrong token or pixel id).
- *Only Server:* the browser's Meta tag did not fire: the cookie banner (opt-in mode and not accepted), or the web container is not previewing. Press Accept and try again.
- *Both rows but not "Deduplicated":* the two event ids differ or the event names differ. Compare the Event ID of both rows; see the troubleshooting table.

## 8. GA4: DebugView, and what "no double counting" looks like

1. Admin > **DebugView** (with the web preview connected). Each action in the table above should produce **one** event of the same name (`page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`), within a few seconds, with the parameter **`event_id`**.
2. **Reports > Realtime**: do one action and look at the "Event count by Event name" card: it must go up **by one**, not two. If it goes up by two, the browser tag **and** something else are sending: see "duplicated GA4 hits" below.
3. For the purchase, `transaction_id` is the order number once only. Reload the confirmation page: nothing new (the shop reports it once per order).

## 9. Publish, in this order, and tidy up

1. **Server container** > **Submit** > Version name `Phase 2` > **Publish**. (It must be live first, so the browser's GA4 never points at an empty address.)
2. **Web container** > workspace `Server v2` > **Submit** > Version name `v2 with server container` > **Publish**. (If you want to be careful, publish it first with `AN - Server URL` still `NONE` and look at the Meta rows, then set the address and publish again.)
3. **Remove the test codes:** in the server container's Meta tag, empty the *Test event code* and publish the server container again; in the shop admin, **Marketing Settings > Meta test event code**, empty it and Save. While a test code is set, real sales are marked as tests.
4. Look at GA4 Realtime and Meta Events Manager for a day: the numbers should match what the shop's admin shows.
5. **Later, in a separate step (not part of this guide):** the shop's own server also sends the Purchase to Meta while this container does. They merge by the same id. Decide which one stays, and read **"Value"** in `docs/tracking-spec.md`: the shop's own server sends the total **with delivery**, this container the items total **without** delivery. A switch to turn the shop's sending off will be built separately.

## 10. Troubleshooting

| Problem | Likely cause | What to do |
| --- | --- | --- |
| No events arrive in the server container preview | `AN - Server URL` is `NONE` or has a typo, the custom domain is not Connected, or the GA4 history setting is still on and the tag is not firing | Web preview: open the `AN - Google tag (GA4)` tag details and read its `server_container_url`. Open the address in a browser. Check step 1 |
| Events arrive, but Meta shows no Server rows | The Meta tag did not fire (no trigger for that event, consent not granted), or Meta refused it (token, pixel id, test code) | Server preview > click the request > the tag's status. Wrong token: generate a new one in Events Manager and paste it into the tag |
| Server rows but not "Deduplicated" | The event ids differ (the browser's `eventID` is not the event's `event_id`), or the event names differ (`ViewContent` vs `view_content`) | Compare the Event ID of the Browser and Server rows. In the web container the Meta tag must have `eventID: {{AN - DLV event_id}}`; in the server tag, Event ID must be `{{AN - ED event_id}}`. Names must be Meta's exact names (table in 6b) |
| Duplicated Purchase in Meta (two Purchases, not merged) | The shop's own server and this container use different ids or the other server sender is still on with a different id | Both must be `order-<number>`. In Test events, open each and compare |
| Wrong value | The shop's own server sends the total **with delivery**, this container without | See "Value" in `docs/tracking-spec.md`. Compare the Browser, Server and shop-server rows |
| Duplicated GA4 hits (every event twice) | The browser also sends GA4 directly, or "Page changes based on browser history events" is on, or a leftover version-1 / Stape tag is still active | Step 0, point 2. In the web container, only `AN - Google tag (GA4)` and the three `AN - GA4 - ...` tags may exist for GA4: pause any other GA4 tag. `AN - Server URL` must be the only route |
| `page_view` counted twice | Enhanced measurement "history events" is still on | Step 0, point 2 |
| Nothing for a visitor who refused cookies | Consent is blocking (correct) | Press Accept and repeat. GA4 sends only cookieless pings without analytics consent; Meta sends nothing without `ad_storage` |
| The hashed email in Meta looks different from the shop's | The template hashed an already-hashed value | In the server preview compare the incoming `sha256_email_address` with what the Meta tag sent. If they differ, switch the template's hashing option off for those fields |
| Meta test events show up as real sales later | A test event code is still saved | Step 9, point 3 |

## What is not included

Google Ads conversions and Enhanced Conversions (the hashed details are in the data layer and the server container, but no tag sends them to Google), TikTok, server-side Purchase for **wallet** orders (bKash, Nagad, Rocket: the browser never sees them as sales, so only the shop's own server sends those, when you verify the payment), turning off the shop's own Purchase sender (a separate, later step), and an importable **server container** file: its structure cannot be checked here without a real export of a server container, so this guide is the way to build it. If you export the empty server container (Admin > Export Container in the server workspace) and add it to the repo, a file can be generated from it.
