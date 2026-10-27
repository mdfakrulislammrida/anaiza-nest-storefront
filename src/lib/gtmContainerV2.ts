// The web container, version 2 (docs/gtm-container-anaizanest-v2.json): the same shop, now sending GA4 events to the Stape server container and
// giving every browser tag the event's own id so that Meta (and the server container) count each action once.
//
// What is different from version 1 (src/lib/gtmContainer.ts):
//   - The Google tag sends to the server container when `AN - Server URL` holds an https address, and straight to Google when it holds NONE (empty).
//     Page views are no longer sent by the Google tag itself (send_page_view is off): a GA4 tag sends the shop's own `page_view` event, with its event_id.
//   - Every GA4 event carries `event_id` as an event parameter, and the hashed contact details (sha256_email_address, sha256_phone_number, external_id)
//     when the shop pushed them (marketing allowed).
//   - Every Meta pixel tag sends eventID = the event's event_id. Purchase's is order-<number>, the id the shop's own server uses too.
//   - TikTok is gone: no tags, no pixel id variable. (Version 1's TikTok tags have to be deleted from the workspace by hand: an import cannot delete.)
//   - One PageView tag for the first page and every page change, with the page_view event's id, instead of a base tag and a page-change tag.
//
// The consent settings are unchanged: the Meta tags need ad_storage, the GA4 tags use Google's own handling.

import {
  BUILT_IN_CONSENT,
  BUILT_IN_INITIALIZATION,
  FINGERPRINT,
  GA4_MEASUREMENT_ID,
  META_PIXEL_ID,
  NO_SERVER,
  V as V1,
  assemble,
  builtInVariables,
  constant,
  currency,
  dataLayerVariable,
  eventTriggers,
  first,
  headerFrom,
  htmlTag,
  landingTrigger,
  metaItems,
  ref,
  template,
  triggerId,
  type ExportFile,
  type Ids,
} from "./gtmContainer.ts";


/** The GA4 events the shop sends that go through the one ecommerce tag. page_view and search have a tag of their own. */
export const GA4_ECOMMERCE_EVENTS = ["view_item_list", "view_item", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase"] as const;

export const V = {
  ...V1,
  pageLocation: "AN - DLV page_location",
  pageTitle: "AN - DLV page_title",
  pageReferrer: "AN - DLV page_referrer",
  userEmail: "AN - DLV user_data.sha256_email_address",
  userPhone: "AN - DLV user_data.sha256_phone_number",
  userExternalId: "AN - DLV user_data.external_id",
} as const;

// Version 2's own ids, away from version 1's (9001 to 9301) and from the ones already in the container (up to about 50).
const variableIds = (n: number) => String(9600 + n);

export function variableEntriesV2(ids: Ids) {
  return [
    constant(ids, variableIds(1), V.ga4Id, GA4_MEASUREMENT_ID, "The GA4 web data stream's Measurement ID (Admin > Data streams)."),
    constant(ids, variableIds(2), V.metaId, META_PIXEL_ID, "The Meta Pixel (dataset) ID. The same one is saved in the shop's Marketing Settings, which the shop's own server purchase uses."),
    constant(ids, variableIds(3), V.serverUrl, NO_SERVER, `NONE = send GA4 straight to Google. To send it through the Stape server container, replace NONE with its address (https://..., no slash at the end). This is the only place the address is kept: the shop does not store it.`),
    {
      note: `What the Google tag really uses: the server address above when it is an https address, or nothing at all while it says ${NO_SERVER}.`,
      item: {
        ...ids,
        variableId: variableIds(4),
        name: V.serverUrlOrNothing,
        type: "jsm",
        parameter: [template("javascript", `function() {\n  var url = ${ref(V.serverUrl)};\n  return (typeof url === 'string' && url.indexOf('https://') === 0) ? url : undefined;\n}`)],
        fingerprint: FINGERPRINT,
        formatValue: {},
      },
    },
    dataLayerVariable(ids, variableIds(11), V.items, "ecommerce.items", "The products of the event: item_id (the SKU), item_name, price, quantity, item_category."),
    dataLayerVariable(ids, variableIds(12), V.value, "ecommerce.value", "A number, in taka. On a purchase: the items total after discount, WITHOUT delivery."),
    dataLayerVariable(ids, variableIds(13), V.currency, "ecommerce.currency", "Always BDT."),
    dataLayerVariable(ids, variableIds(14), V.transactionId, "ecommerce.transaction_id", "Purchase only: the order number."),
    dataLayerVariable(ids, variableIds(15), V.shipping, "ecommerce.shipping", "Purchase only: the delivery fee."),
    dataLayerVariable(ids, variableIds(16), V.coupon, "ecommerce.coupon", "Not sent by the site yet (kept here so it works the day it is)."),
    dataLayerVariable(ids, variableIds(17), V.listName, "ecommerce.item_list_name", "view_item_list only. A landing page's list is named 'Landing page: <slug>'."),
    dataLayerVariable(ids, variableIds(18), V.paymentType, "ecommerce.payment_type", "add_payment_info only: cod, bkash, nagad or rocket."),
    dataLayerVariable(ids, variableIds(19), V.shippingTier, "ecommerce.shipping_tier", "add_shipping_info only: Inside Dhaka or Outside Dhaka."),
    dataLayerVariable(ids, variableIds(20), V.eventId, "event_id", "Every event: <event>.<16 characters>; on a purchase order-<order number>. Meta counts the browser and the server event once when the name and this id are the same."),
    dataLayerVariable(ids, variableIds(21), V.searchTerm, "search_term", "search only."),
    dataLayerVariable(ids, variableIds(22), V.pageLocation, "page_location", "page_view only: the address of the page."),
    dataLayerVariable(ids, variableIds(23), V.pageTitle, "page_title", "page_view only: the page's title."),
    dataLayerVariable(ids, variableIds(24), V.pageReferrer, "page_referrer", "page_view only: the page the visitor came from."),
    dataLayerVariable(ids, variableIds(25), V.userEmail, "user_data.sha256_email_address", "begin_checkout, add_payment_info and purchase, only when marketing is allowed and the email is known: SHA-256 of the trimmed, lower-case email."),
    dataLayerVariable(ids, variableIds(26), V.userPhone, "user_data.sha256_phone_number", "The same, for the phone: SHA-256 of the number as 8801XXXXXXXXX (digits only, no plus)."),
    dataLayerVariable(ids, variableIds(27), V.userExternalId, "user_data.external_id", "The same: SHA-256 of the customer id for a signed-in customer, else of the phone number."),
  ];
}

export function triggerEntriesV2(ids: Ids) {
  return [...eventTriggers, landingTrigger].map((trigger) => ({
    note: trigger.landingOnly
      ? "The data layer event view_item_list, only when its list is named 'Landing page: ...' (a campaign landing page)."
      : `The data layer event ${trigger.event}.`,
    item: {
      ...ids,
      triggerId: trigger.id,
      name: trigger.name,
      type: "CUSTOM_EVENT",
      customEventFilter: [{ type: "EQUALS", parameter: [template("arg0", "{{_event}}"), template("arg1", trigger.event)] }],
      ...(trigger.landingOnly
        ? { filter: [{ type: "STARTS_WITH", parameter: [template("arg0", ref(V.listName)), template("arg1", "Landing page:")] }] }
        : {}),
      fingerprint: FINGERPRINT,
    },
  }));
}

const row = (name: string, value: string) => ({ type: "MAP", map: [template("parameter", name), template("parameterValue", value)] });

function ga4Event(ids: Ids, tagId: string, name: string, note: string, eventName: string, ecommerce: boolean, rows: ReturnType<typeof row>[], firing: string[]) {
  return {
    note,
    item: {
      ...ids,
      tagId,
      name,
      type: "gaawe",
      parameter: [
        { type: "BOOLEAN", key: "sendEcommerceData", value: String(ecommerce) },
        ...(ecommerce ? [template("getEcommerceDataFrom", "dataLayer")] : []),
        { type: "LIST", key: "eventSettingsTable", list: rows },
        template("eventName", eventName),
        template("measurementIdOverride", ref(V.ga4Id)),
      ],
      fingerprint: FINGERPRINT,
      firingTriggerId: firing,
      tagFiringOption: "ONCE_PER_EVENT",
      monitoringMetadata: { type: "MAP" },
      consentSettings: BUILT_IN_CONSENT,
    },
  };
}

export function ga4TagEntriesV2(ids: Ids) {
  const googleTag = {
    note: "Loads GA4 once per page, before everything else, and sends to the Stape server container when 'AN - Server URL' holds its https address (straight to Google while it says NONE). It does not send page_view itself: the shop's own page_view event does (the tag below), so every page view has an event_id.",
    item: {
      ...ids,
      tagId: "9701",
      name: "AN - Google tag (GA4)",
      type: "googtag",
      parameter: [
        template("tagId", ref(V.ga4Id)),
        { type: "LIST", key: "configSettingsTable", list: [row("server_container_url", ref(V.serverUrlOrNothing)), row("send_page_view", "false")] },
      ],
      fingerprint: FINGERPRINT,
      firingTriggerId: [BUILT_IN_INITIALIZATION],
      tagFiringOption: "ONCE_PER_LOAD",
      monitoringMetadata: { type: "MAP" },
      consentSettings: BUILT_IN_CONSENT,
    },
  };

  const pageView = ga4Event(
    ids,
    "9702",
    "AN - GA4 - page_view",
    "Every page of a visit (the first and each page change): the shop's own page_view event, with its address, title, referrer and event_id.",
    "page_view",
    false,
    [row("event_id", ref(V.eventId)), row("page_location", ref(V.pageLocation)), row("page_title", ref(V.pageTitle)), row("page_referrer", ref(V.pageReferrer))],
    [triggerId("page_view")],
  );

  const search = ga4Event(ids, "9703", "AN - GA4 - search", "A search on the shop page.", "search", false, [row("event_id", ref(V.eventId)), row("search_term", ref(V.searchTerm))], [triggerId("search")]);

  // One tag for the ecommerce events, named by the event itself ({{Event}}): the shop pushes GA4's own names with the ecommerce object GA4 expects.
  const ecommerce = ga4Event(
    ids,
    "9704",
    "AN - GA4 - ecommerce events",
    `Sends ${GA4_ECOMMERCE_EVENTS.join(", ")} under their own names, with the ecommerce object from the data layer (items, value, currency, transaction_id, shipping) and, on every one, the event_id. The hashed email, phone and external id are added when the shop pushed them (marketing allowed): they are for the server container, which hands them to Meta.`,
    "{{Event}}",
    true,
    [
      row("event_id", ref(V.eventId)),
      row("sha256_email_address", ref(V.userEmail)),
      row("sha256_phone_number", ref(V.userPhone)),
      row("external_id", ref(V.userExternalId)),
    ],
    GA4_ECOMMERCE_EVENTS.map(triggerId),
  );

  return [googleTag, pageView, search, ecommerce];
}

const META_INSTALL = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
const META_INIT = `if (!window._anMetaInit) { fbq('init', ${ref(V.metaId)}); window._anMetaInit = true; }`;
const withId = `{ eventID: ${ref(V.eventId)} }`;

export function metaTagEntriesV2(ids: Ids) {
  const tag = (n: number, name: string, code: string, firing: string[], note: string) => htmlTag(ids, String(9710 + n), name, code, firing, note);
  const guard = `(function () {\n  if (!window.fbq) return;\n`;

  return [
    tag(1, "AN - Meta Pixel - init + PageView", `${META_INSTALL}\n${META_INIT}\nfbq('track', 'PageView', {}, ${withId});`, [triggerId("page_view")], "Starts the Meta pixel (once) and counts the page, for the first page and every page change, with the page_view event's id (the server container sends the same PageView with it)."),
    tag(2, "AN - Meta Pixel - init after consent", `${META_INSTALL}\n${META_INIT}`, [triggerId("anaiza_consent_changed")], "If the visitor allows marketing after the page was counted, this starts the pixel for what they do next (nothing is counted for the page they were already on)."),
    tag(3, "AN - Meta Pixel - ViewContent (product)", `${guard}  var i = ${first};\n  fbq('track', 'ViewContent', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} }, ${withId});\n})();`, [triggerId("view_item")], "A product page."),
    tag(4, "AN - Meta Pixel - ViewContent (landing page)", `${guard}  ${metaItems}\n  fbq('track', 'ViewContent', { content_ids: ids, contents: contents.map(function (c, n) { return { id: c.id, quantity: 1, item_price: items[n].price }; }), content_type: 'product', currency: ${currency}, value: items.length ? Math.min.apply(null, items.map(function (i) { return i.price; })) : 0 }, ${withId});\n})();`, [landingTrigger.id], "A campaign landing page: one ViewContent listing its products, at the cheapest price."),
    tag(5, "AN - Meta Pixel - AddToCart", `${guard}  var i = ${first};\n  fbq('track', 'AddToCart', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} }, ${withId});\n})();`, [triggerId("add_to_cart")], "Add to cart."),
    tag(6, "AN - Meta Pixel - InitiateCheckout", `${guard}  ${metaItems}\n  fbq('track', 'InitiateCheckout', { content_ids: ids, contents: contents, content_type: 'product', currency: ${currency}, value: ${ref(V.value)}, num_items: contents.reduce(function (n, c) { return n + c.quantity; }, 0) }, ${withId});\n})();`, [triggerId("begin_checkout")], "The checkout page opens with something in the cart."),
    tag(7, "AN - Meta Pixel - AddPaymentInfo", `${guard}  ${metaItems}\n  fbq('track', 'AddPaymentInfo', { content_ids: ids, contents: contents, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} }, ${withId});\n})();`, [triggerId("add_payment_info")], "A payment method is chosen."),
    tag(8, "AN - Meta Pixel - Purchase", `${guard}  ${metaItems}\n  var user = {};\n  var email = ${ref(V.userEmail)}; var phone = ${ref(V.userPhone)}; var external = ${ref(V.userExternalId)};\n  if (email) { user.em = email; }\n  if (phone) { user.ph = phone; }\n  if (external) { user.external_id = external; }\n  if (email || phone || external) { fbq('init', ${ref(V.metaId)}, user); }\n  fbq('track', 'Purchase', { content_ids: ids, contents: contents, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} }, ${withId});\n})();`, [triggerId("purchase")], "A cash-on-delivery order is placed. eventID is order-<number>, the id the shop's own server and the server container use too. The value is the items total after discount, without delivery. Hashed buyer details are used only when the visitor allowed marketing."),
  ];
}

const items = <T>(entries: { item: T }[]) => entries.map((entry) => entry.item);

export function buildContainerV2(base: ExportFile | null = null): ExportFile {
  const { ids } = headerFrom(base);

  return assemble(base, {
    tag: items([...ga4TagEntriesV2(ids), ...metaTagEntriesV2(ids)]),
    trigger: items(triggerEntriesV2(ids)),
    variable: items(variableEntriesV2(ids)),
    builtInVariable: builtInVariables(ids),
  });
}
