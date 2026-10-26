// Builds the Google Tag Manager container Tajin imports (docs/gtm-container-anaizanest.json), from the events this site pushes
// (docs/tracking-spec.md). Written as code so the container and the site cannot drift apart: gtmContainer.test.ts checks that
// every event the site sends has a trigger, that every name a tag mentions exists, and that the committed JSON is this output.
//
// Phase 1: the web container only. GA4, the Meta pixel and the TikTok pixel run as browser tags in it. The backend sends the
// server-side Meta / TikTok Purchase itself, with the same event id as the browser's.

export const GA4_MEASUREMENT_ID = "G-1V0Q6EN05B";
export const WEB_CONTAINER_ID = "GTM-MS2HWSWF";
export const META_PIXEL_ID = "956723840598016";
export const TIKTOK_PLACEHOLDER = "REPLACE_WITH_TIKTOK_PIXEL_ID";

/** Every event the storefront pushes to the data layer. The tracking spec lists the same ones. */
export const SITE_EVENTS = [
  "page_view",
  "view_item_list",
  "view_item",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "add_shipping_info",
  "add_payment_info",
  "purchase",
  "order_pending_payment",
  "anaiza_consent_changed",
] as const;

/** The events GA4 receives as they are, with the whole ecommerce object. (page_view is counted by the Google tag itself.) */
export const GA4_EVENTS = ["view_item_list", "view_item", "search", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase"] as const;

const BUILT_IN_ALL_PAGES = "2147479553";
const BUILT_IN_INITIALIZATION = "2147479573";

type Param = { type: string; key: string; value?: string; list?: unknown[]; map?: Param[] };
const ids = { accountId: "0", containerId: "0" };
const template = (key: string, value: string): Param => ({ type: "TEMPLATE", key, value });

// ---- Variables

const V = {
  ga4Id: "AN - GA4 Measurement ID",
  metaId: "AN - Meta Pixel ID",
  tiktokId: "AN - TikTok Pixel ID",
  serverUrl: "AN - Server URL",
  serverUrlOrNothing: "AN - Server URL (omit when empty)",
  items: "AN - DLV ecommerce.items",
  value: "AN - DLV ecommerce.value",
  currency: "AN - DLV ecommerce.currency",
  transactionId: "AN - DLV ecommerce.transaction_id",
  shipping: "AN - DLV ecommerce.shipping",
  coupon: "AN - DLV ecommerce.coupon",
  listName: "AN - DLV ecommerce.item_list_name",
  paymentType: "AN - DLV ecommerce.payment_type",
  shippingTier: "AN - DLV ecommerce.shipping_tier",
  eventId: "AN - DLV event_id",
  searchTerm: "AN - DLV search_term",
  userData: "AN - DLV user_data",
  metaUserData: "AN - DLV meta_user_data",
} as const;

const ref = (name: string) => `{{${name}}}`;

function constant(variableId: string, name: string, value: string, note: string) {
  return { ...ids, variableId, name, type: "c", notes: note, parameter: [template("value", value)], fingerprint: "0" };
}

function dataLayerVariable(variableId: string, name: string, path: string, note: string) {
  return {
    ...ids,
    variableId,
    name,
    type: "v",
    notes: note,
    parameter: [
      { type: "INTEGER", key: "dataLayerVersion", value: "2" },
      { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
      template("name", path),
    ],
    fingerprint: "0",
  };
}

function variables() {
  return [
    constant("101", V.ga4Id, GA4_MEASUREMENT_ID, "The GA4 web data stream's Measurement ID (Admin > Data streams). Edit here if it changes."),
    constant("102", V.metaId, META_PIXEL_ID, "The Meta Pixel (dataset) ID. The same one is saved in the shop's Marketing Settings, which the server's Purchase uses."),
    constant("103", V.tiktokId, TIKTOK_PLACEHOLDER, "Replace with the TikTok Pixel ID (TikTok Events Manager > Web events > your pixel). The container does nothing for TikTok until you do."),
    constant("104", V.serverUrl, "", "Leave EMPTY in phase 1. In phase 2, fill with the first-party address of the Stape server container (for example https://sgtm.anaizanest.com) to send the GA4 stream through it; nothing else changes."),
    {
      ...ids,
      variableId: "105",
      name: V.serverUrlOrNothing,
      type: "jsm",
      notes: "What the Google tag really uses: the server address above, or nothing at all while it is empty (an empty text would be sent as an empty setting).",
      parameter: [template("javascript", `function() {\n  var url = ${ref(V.serverUrl)};\n  return url ? url : undefined;\n}`)],
      fingerprint: "0",
    },
    dataLayerVariable("111", V.items, "ecommerce.items", "The products of the event: item_id (the SKU, else the product id), item_name, price, quantity."),
    dataLayerVariable("112", V.value, "ecommerce.value", "A number, in taka."),
    dataLayerVariable("113", V.currency, "ecommerce.currency", "Always BDT."),
    dataLayerVariable("114", V.transactionId, "ecommerce.transaction_id", "Purchase only: the order number."),
    dataLayerVariable("115", V.shipping, "ecommerce.shipping", "Purchase only: the delivery fee."),
    dataLayerVariable("116", V.coupon, "ecommerce.coupon", "Not sent by the site yet (kept here so it works the day it is)."),
    dataLayerVariable("117", V.listName, "ecommerce.item_list_name", "view_item_list only. A landing page's list is named 'Landing page: <slug>'."),
    dataLayerVariable("118", V.paymentType, "ecommerce.payment_type", "add_payment_info only: cod, bkash, nagad or rocket."),
    dataLayerVariable("119", V.shippingTier, "ecommerce.shipping_tier", "add_shipping_info only: Inside Dhaka or Outside Dhaka."),
    dataLayerVariable("120", V.eventId, "event_id", "Purchase only: order-<order number>. The shop's server sends the same id with its Meta / TikTok purchase, so each platform counts the sale once."),
    dataLayerVariable("121", V.searchTerm, "search_term", "search only."),
    dataLayerVariable("122", V.userData, "user_data", "Purchase only, and only when the visitor allowed marketing: SHA-256 hashed details for Google Enhanced Conversions (not used in phase 1)."),
    dataLayerVariable("123", V.metaUserData, "meta_user_data", "Purchase only, and only when the visitor allowed marketing: SHA-256 hashed details for Meta advanced matching."),
  ];
}

// ---- Triggers

type TriggerDef = { id: string; name: string; event: string; landingOnly?: boolean };

const eventTriggers: TriggerDef[] = SITE_EVENTS.map((event, index) => ({ id: String(201 + index), name: `AN - CE ${event}`, event }));
const landingTrigger: TriggerDef = { id: "301", name: "AN - CE view_item_list (landing page)", event: "view_item_list", landingOnly: true };

const triggerId = (event: string) => eventTriggers.find((trigger) => trigger.event === event)?.id ?? "";

function triggers() {
  return [...eventTriggers, landingTrigger].map((trigger) => ({
    ...ids,
    triggerId: trigger.id,
    name: trigger.name,
    type: "CUSTOM_EVENT",
    customEventFilter: [
      { type: "EQUALS", parameter: [template("arg0", "{{_event}}"), template("arg1", trigger.event)] },
    ],
    ...(trigger.landingOnly
      ? { filter: [{ type: "STARTS_WITH", parameter: [template("arg0", ref(V.listName)), template("arg1", "Landing page:")] }] }
      : {}),
    fingerprint: "0",
  }));
}

// ---- Tags

const AD_CONSENT = { consentStatus: "NEEDED", consentType: { type: "LIST", list: [{ type: "TEMPLATE", value: "ad_storage" }] } };
const BUILT_IN_CONSENT = { consentStatus: "NOT_SET" };

function htmlTag(tagId: string, name: string, html: string, firing: string[], note: string, option = "ONCE_PER_EVENT") {
  return {
    ...ids,
    tagId,
    name,
    type: "html",
    notes: note,
    parameter: [template("html", `<script>\n${html}\n</script>`), { type: "BOOLEAN", key: "supportDocumentWrite", value: "false" }],
    fingerprint: "0",
    firingTriggerId: firing,
    tagFiringOption: option,
    monitoringMetadata: { type: "MAP" },
    consentSettings: AD_CONSENT,
  };
}

const first = `(${ref(V.items)} || [])[0] || {}`;
const currency = `${ref(V.currency)} || 'BDT'`;

// One line of items as Meta wants them: content_ids, and contents with a quantity.
const metaItems = `var items = ${ref(V.items)} || [];\n  var ids = items.map(function (i) { return i.item_id; });\n  var contents = items.map(function (i) { return { id: i.item_id, quantity: i.quantity || 1 }; });`;
// The same for TikTok: contents with content_id, quantity and price.
const tiktokItems = `var items = ${ref(V.items)} || [];\n  var contents = items.map(function (i) { return { content_id: i.item_id, quantity: i.quantity || 1, price: i.price }; });`;

const META_BASE = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', ${ref(V.metaId)});\nfbq('track', 'PageView');`;

const TIKTOK_BASE = `!function (w, d, t) {\n  w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];\n  ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];\n  ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };\n  for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);\n  ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };\n  ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = document.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t; var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) };\n  ttq.load(${ref(V.tiktokId)});\n  ttq.page();\n}(window, document, 'ttq');`;

function tags() {
  const googleTag = {
    ...ids,
    tagId: "1",
    name: "AN - Google tag (GA4)",
    type: "googtag",
    notes: "Loads GA4 once per page, before everything else. It counts the first page view and, with Enhanced measurement on (see the guide), every page change. The server address is added only when 'AN - Server URL' is filled in (phase 2).",
    parameter: [
      template("tagId", ref(V.ga4Id)),
      {
        type: "LIST",
        key: "configSettingsTable",
        list: [{ type: "MAP", map: [template("parameter", "server_container_url"), template("parameterValue", ref(V.serverUrlOrNothing))] }],
      },
    ],
    fingerprint: "0",
    firingTriggerId: [BUILT_IN_INITIALIZATION],
    tagFiringOption: "ONCE_PER_LOAD",
    monitoringMetadata: { type: "MAP" },
    consentSettings: BUILT_IN_CONSENT,
  };

  // One tag for every GA4 event, named by the event itself ({{Event}}): the site already pushes GA4's own event names with the
  // ecommerce object GA4 expects, so a tag per event would repeat the same settings ten times and could drift apart.
  const ga4Events = {
    ...ids,
    tagId: "2",
    name: "AN - GA4 - ecommerce and search events",
    type: "gaawe",
    notes: `Sends ${GA4_EVENTS.join(", ")} to GA4 under their own names, with the ecommerce object from the data layer (items, value, currency, transaction_id, shipping). One tag instead of ten, so the settings cannot differ.`,
    parameter: [
      { type: "BOOLEAN", key: "sendEcommerceData", value: "true" },
      template("getEcommerceDataFrom", "dataLayer"),
      template("eventName", "{{Event}}"),
      template("measurementIdOverride", ref(V.ga4Id)),
      {
        type: "LIST",
        key: "eventSettingsTable",
        list: [{ type: "MAP", map: [template("parameter", "search_term"), template("parameterValue", ref(V.searchTerm))] }],
      },
    ],
    fingerprint: "0",
    firingTriggerId: GA4_EVENTS.map(triggerId),
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: BUILT_IN_CONSENT,
  };

  const baseTriggers = [BUILT_IN_ALL_PAGES, triggerId("anaiza_consent_changed")];
  const metaTags = [
    htmlTag("11", "AN - Meta Pixel - base + PageView", META_BASE, baseTriggers, "Starts the Meta pixel and counts the first page view. Needs ad_storage; if the visitor allows marketing later, the consent event starts it then (once per page).", "ONCE_PER_LOAD"),
    htmlTag("12", "AN - Meta Pixel - PageView (page change)", `if (window.fbq) { fbq('track', 'PageView'); }`, [triggerId("page_view")], "A page change inside the shop (the site pushes page_view)."),
    htmlTag("13", "AN - Meta Pixel - ViewContent (product)", `(function () {\n  if (!window.fbq) return;\n  var i = ${first};\n  fbq('track', 'ViewContent', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("view_item")], "A product page."),
    htmlTag("14", "AN - Meta Pixel - ViewContent (landing page)", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'ViewContent', { content_ids: ids, contents: contents.map(function (c, n) { return { id: c.id, quantity: 1, item_price: items[n].price }; }), content_type: 'product', currency: ${currency}, value: items.length ? Math.min.apply(null, items.map(function (i) { return i.price; })) : 0 });\n})();`, [landingTrigger.id], "A campaign landing page: one ViewContent listing its products, at the cheapest price (the same as the site's own pixel call)."),
    htmlTag("15", "AN - Meta Pixel - AddToCart", `(function () {\n  if (!window.fbq) return;\n  var i = ${first};\n  fbq('track', 'AddToCart', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_to_cart")], "Add to cart."),
    htmlTag("16", "AN - Meta Pixel - InitiateCheckout", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'InitiateCheckout', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)}, num_items: contents.reduce(function (n, c) { return n + c.quantity; }, 0) });\n})();`, [triggerId("begin_checkout")], "The checkout page opens with something in the cart."),
    htmlTag("17", "AN - Meta Pixel - AddPaymentInfo", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'AddPaymentInfo', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_payment_info")], "A payment method is chosen."),
    htmlTag("18", "AN - Meta Pixel - Purchase", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  var user = ${ref(V.metaUserData)};\n  if (user && typeof user === 'object') { fbq('init', ${ref(V.metaId)}, user); }\n  fbq('track', 'Purchase', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)} }, { eventID: ${ref(V.eventId)} });\n})();`, [triggerId("purchase")], "A cash-on-delivery order is placed. eventID is order-<number>, the same id the shop's server sends to the Conversions API, so Meta counts the sale once. Hashed buyer details are used only when the visitor allowed marketing."),
  ];

  const tiktokTags = [
    htmlTag("21", "AN - TikTok Pixel - base + page", TIKTOK_BASE, baseTriggers, "Starts the TikTok pixel and counts the first page view. Needs ad_storage (see the Meta base tag).", "ONCE_PER_LOAD"),
    htmlTag("22", "AN - TikTok Pixel - page (page change)", `if (window.ttq) { ttq.page(); }`, [triggerId("page_view")], "A page change inside the shop."),
    htmlTag("23", "AN - TikTok Pixel - ViewContent (product)", `(function () {\n  if (!window.ttq) return;\n  var i = ${first};\n  ttq.track('ViewContent', { content_id: i.item_id, content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("view_item")], "A product page."),
    htmlTag("24", "AN - TikTok Pixel - ViewContent (landing page)", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('ViewContent', { contents: contents, content_type: 'product', currency: ${currency}, value: items.length ? Math.min.apply(null, items.map(function (i) { return i.price; })) : 0 });\n})();`, [landingTrigger.id], "A campaign landing page."),
    htmlTag("25", "AN - TikTok Pixel - AddToCart", `(function () {\n  if (!window.ttq) return;\n  var i = ${first};\n  ttq.track('AddToCart', { content_id: i.item_id, content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_to_cart")], "Add to cart."),
    htmlTag("26", "AN - TikTok Pixel - InitiateCheckout", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('InitiateCheckout', { contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("begin_checkout")], "The checkout page opens with something in the cart."),
    htmlTag("27", "AN - TikTok Pixel - AddPaymentInfo", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('AddPaymentInfo', { contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_payment_info")], "A payment method is chosen."),
    htmlTag("28", "AN - TikTok Pixel - CompletePayment (purchase)", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('CompletePayment', { content_type: 'product', contents: contents, currency: ${currency}, value: ${ref(V.value)} }, { event_id: ${ref(V.eventId)} });\n})();`, [triggerId("purchase")], "A cash-on-delivery order is placed. TikTok's CompletePayment is the event the shop's server sends too, with the same event_id (order-<number>), so TikTok counts the sale once."),
  ];

  return [googleTag, ga4Events, ...metaTags, ...tiktokTags];
}

const builtInVariable = [
  { type: "EVENT", name: "Event" },
  { type: "PAGE_URL", name: "Page URL" },
  { type: "PAGE_HOSTNAME", name: "Page Hostname" },
  { type: "PAGE_PATH", name: "Page Path" },
  { type: "REFERRER", name: "Referrer" },
].map((variable) => ({ ...ids, ...variable }));

export function buildContainer() {
  return {
    exportFormatVersion: 2,
    exportTime: "2026-10-27 09:00:00",
    containerVersion: {
      path: "accounts/0/containers/0/versions/0",
      ...ids,
      containerVersionId: "0",
      container: {
        path: "accounts/0/containers/0",
        ...ids,
        name: "Anaiza Nest web",
        publicId: WEB_CONTAINER_ID,
        usageContext: ["WEB"],
        fingerprint: "0",
        tagManagerUrl: "https://tagmanager.google.com/#/container/accounts/0/containers/0/workspaces?apiLink=container",
      },
      tag: tags(),
      trigger: triggers(),
      variable: variables(),
      builtInVariable,
      fingerprint: "0",
      tagManagerUrl: "https://tagmanager.google.com/#/versions/accounts/0/containers/0/versions/0?apiLink=version",
    },
  };
}
