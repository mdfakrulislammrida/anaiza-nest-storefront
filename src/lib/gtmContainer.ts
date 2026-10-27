// Builds the Google Tag Manager container Tajin imports (docs/gtm-container-anaizanest.json and the smaller files in docs/gtm/), and the
// by-hand version of it (docs/gtm-manual-build.md), from the events this site pushes (docs/tracking-spec.md). Written as code so the
// container and the site cannot drift apart: gtmContainer.test.ts checks that every event the site sends has a trigger, that every
// name a tag mentions exists, and that the committed files are this output. gtmValidate.ts checks the shape.
//
// The export's header (account id, container id, the container block with its features, the fingerprints' style) is copied from a real
// export of the empty container, docs/gtm-export-empty.json, when that file is there. Without it the header is a best-known default.
//
// Phase 1: the web container only. GA4, the Meta pixel and the TikTok pixel run as browser tags in it. The backend sends the
// server-side Meta / TikTok Purchase itself, with the same event id as the browser's.

export const GA4_MEASUREMENT_ID = "G-1V0Q6EN05B";
export const WEB_CONTAINER_ID = "GTM-MS2HWSWF";
export const META_PIXEL_ID = "956723840598016";
export const TIKTOK_PLACEHOLDER = "REPLACE_WITH_TIKTOK_PIXEL_ID";
/** The "no server container" value of AN - Server URL. (GTM does not keep a constant with nothing in it, so "empty" is this word.) */
export const NO_SERVER = "NONE";

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

export const BUILT_IN_ALL_PAGES = "2147479553";
export const BUILT_IN_INITIALIZATION = "2147479573";
export const BUILT_IN_TRIGGER_IDS = [BUILT_IN_ALL_PAGES, BUILT_IN_INITIALIZATION];
/** GTM writes a fingerprint as a number of milliseconds, in text. */
export const FINGERPRINT = "1761555600000";

export type Param = { type: string; key: string; value?: string; list?: unknown[]; map?: Param[] };
export type Ids = { accountId: string; containerId: string };
export type Entry<T> = { note: string; item: T };

export const template = (key: string, value: string): Param => ({ type: "TEMPLATE", key, value });
export const ref = (name: string) => `{{${name}}}`;

// ---- The header of an export

export type ExportFile = { exportFormatVersion: number; exportTime: string; containerVersion: Record<string, unknown> };

/** The pieces of an export that are not the container's contents. With no export of the empty container, a best-known default. */
export function headerFrom(base: ExportFile | null): { ids: Ids; file: ExportFile } {
  if (base) {
    const version = base.containerVersion as { accountId?: string; containerId?: string };

    return { ids: { accountId: String(version.accountId), containerId: String(version.containerId) }, file: base };
  }

  const ids = { accountId: "0", containerId: "0" };

  return {
    ids,
    file: {
      exportFormatVersion: 2,
      exportTime: "2026-10-27 09:00:00",
      containerVersion: {
        path: `accounts/${ids.accountId}/containers/${ids.containerId}/versions/0`,
        accountId: ids.accountId,
        containerId: ids.containerId,
        containerVersionId: "0",
        container: {
          path: `accounts/${ids.accountId}/containers/${ids.containerId}`,
          accountId: ids.accountId,
          containerId: ids.containerId,
          name: "Anaiza Nest web",
          publicId: WEB_CONTAINER_ID,
          usageContext: ["WEB"],
          fingerprint: FINGERPRINT,
          tagManagerUrl: `https://tagmanager.google.com/#/container/accounts/${ids.accountId}/containers/${ids.containerId}/workspaces?apiLink=container`,
          features: {
            supportUserPermissions: true,
            supportEnvironments: true,
            supportWorkspaces: true,
            supportGtagConfigs: false,
            supportBuiltInVariables: true,
            supportClients: false,
            supportFolders: true,
            supportTags: true,
            supportTemplates: true,
            supportTriggers: true,
            supportVariables: true,
            supportVersions: true,
            supportZones: true,
            supportTransformations: false,
          },
          tagIds: [WEB_CONTAINER_ID],
        },
        fingerprint: FINGERPRINT,
        tagManagerUrl: `https://tagmanager.google.com/#/versions/accounts/${ids.accountId}/containers/${ids.containerId}/versions/0?apiLink=version`,
      },
    },
  };
}

// ---- Variables

export const V = {
  ga4Id: "AN - GA4 Measurement ID",
  metaId: "AN - Meta Pixel ID",
  tiktokId: "AN - TikTok Pixel ID",
  serverUrl: "AN - Server URL",
  serverUrlOrNothing: "AN - Server URL (omit when none)",
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

export function constant(ids: Ids, variableId: string, name: string, value: string, note: string) {
  return { note, item: { ...ids, variableId, name, type: "c", parameter: [template("value", value)], fingerprint: FINGERPRINT, formatValue: {} } };
}

export function dataLayerVariable(ids: Ids, variableId: string, name: string, path: string, note: string) {
  return {
    note,
    item: {
      ...ids,
      variableId,
      name,
      type: "v",
      parameter: [
        { type: "INTEGER", key: "dataLayerVersion", value: "2" },
        { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
        template("name", path),
      ],
      fingerprint: FINGERPRINT,
      formatValue: {},
    },
  };
}

export function variableEntries(ids: Ids) {
  return [
    constant(ids, "9101", V.ga4Id, GA4_MEASUREMENT_ID, "The GA4 web data stream's Measurement ID (Admin > Data streams). Edit here if it changes."),
    constant(ids, "9102", V.metaId, META_PIXEL_ID, "The Meta Pixel (dataset) ID. The same one is saved in the shop's Marketing Settings, which the server's Purchase uses."),
    constant(ids, "9103", V.tiktokId, TIKTOK_PLACEHOLDER, "Replace with the TikTok Pixel ID (TikTok Events Manager > Web events > your pixel). The container does nothing for TikTok until you do."),
    constant(ids, "9104", V.serverUrl, NO_SERVER, `Leave as ${NO_SERVER} in phase 1 (GTM will not keep a constant with nothing in it, so NONE means "no server container"). In phase 2, replace with the first-party address of the Stape server container, for example https://sgtm.anaizanest.com, to send the GA4 stream through it; nothing else changes.`),
    {
      note: `What the Google tag really uses: the server address above when it is an https address, or nothing at all while it says ${NO_SERVER}.`,
      item: {
        ...ids,
        variableId: "9105",
        name: V.serverUrlOrNothing,
        type: "jsm",
        parameter: [template("javascript", `function() {\n  var url = ${ref(V.serverUrl)};\n  return (typeof url === 'string' && url.indexOf('https://') === 0) ? url : undefined;\n}`)],
        fingerprint: FINGERPRINT,
        formatValue: {},
      },
    },
    dataLayerVariable(ids, "9111", V.items, "ecommerce.items", "The products of the event: item_id (the SKU, else the product id), item_name, price, quantity."),
    dataLayerVariable(ids, "9112", V.value, "ecommerce.value", "A number, in taka."),
    dataLayerVariable(ids, "9113", V.currency, "ecommerce.currency", "Always BDT."),
    dataLayerVariable(ids, "9114", V.transactionId, "ecommerce.transaction_id", "Purchase only: the order number."),
    dataLayerVariable(ids, "9115", V.shipping, "ecommerce.shipping", "Purchase only: the delivery fee."),
    dataLayerVariable(ids, "9116", V.coupon, "ecommerce.coupon", "Not sent by the site yet (kept here so it works the day it is)."),
    dataLayerVariable(ids, "9117", V.listName, "ecommerce.item_list_name", "view_item_list only. A landing page's list is named 'Landing page: <slug>'."),
    dataLayerVariable(ids, "9118", V.paymentType, "ecommerce.payment_type", "add_payment_info only: cod, bkash, nagad or rocket."),
    dataLayerVariable(ids, "9119", V.shippingTier, "ecommerce.shipping_tier", "add_shipping_info only: Inside Dhaka or Outside Dhaka."),
    dataLayerVariable(ids, "9120", V.eventId, "event_id", "Purchase only: order-<order number>. The shop's server sends the same id with its Meta / TikTok purchase, so each platform counts the sale once."),
    dataLayerVariable(ids, "9121", V.searchTerm, "search_term", "search only."),
    dataLayerVariable(ids, "9122", V.userData, "user_data", "Purchase only, and only when the visitor allowed marketing: SHA-256 hashed details for Google Enhanced Conversions (not used in phase 1)."),
    dataLayerVariable(ids, "9123", V.metaUserData, "meta_user_data", "Purchase only, and only when the visitor allowed marketing: SHA-256 hashed details for Meta advanced matching."),
  ];
}

// ---- Triggers

export type TriggerDef = { id: string; name: string; event: string; landingOnly?: boolean };

export const eventTriggers: TriggerDef[] = SITE_EVENTS.map((event, index) => ({ id: String(9201 + index), name: `AN - CE ${event}`, event }));
export const landingTrigger: TriggerDef = { id: "9301", name: "AN - CE view_item_list (landing page)", event: "view_item_list", landingOnly: true };

export const triggerId = (event: string) => eventTriggers.find((trigger) => trigger.event === event)?.id ?? "";

export function triggerEntries(ids: Ids) {
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

// ---- Tags

export const AD_CONSENT = { consentStatus: "NEEDED", consentType: { type: "LIST", list: [{ type: "TEMPLATE", value: "ad_storage" }] } };
export const BUILT_IN_CONSENT = { consentStatus: "NOT_SET" };

export function htmlTag(ids: Ids, tagId: string, name: string, html: string, firing: string[], note: string, option = "ONCE_PER_EVENT") {
  return {
    note,
    item: {
      ...ids,
      tagId,
      name,
      type: "html",
      parameter: [template("html", `<script>\n${html}\n</script>`), { type: "BOOLEAN", key: "supportDocumentWrite", value: "false" }],
      fingerprint: FINGERPRINT,
      firingTriggerId: firing,
      tagFiringOption: option,
      monitoringMetadata: { type: "MAP" },
      consentSettings: AD_CONSENT,
    },
  };
}

export const first = `(${ref(V.items)} || [])[0] || {}`;
export const currency = `${ref(V.currency)} || 'BDT'`;

// One line of items as Meta wants them: content_ids, and contents with a quantity.
export const metaItems = `var items = ${ref(V.items)} || [];\n  var ids = items.map(function (i) { return i.item_id; });\n  var contents = items.map(function (i) { return { id: i.item_id, quantity: i.quantity || 1 }; });`;
// The same for TikTok: contents with content_id, quantity and price.
const tiktokItems = `var items = ${ref(V.items)} || [];\n  var contents = items.map(function (i) { return { content_id: i.item_id, quantity: i.quantity || 1, price: i.price }; });`;

const META_BASE = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', ${ref(V.metaId)});\nfbq('track', 'PageView');`;

const TIKTOK_BASE = `!function (w, d, t) {\n  w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];\n  ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];\n  ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };\n  for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);\n  ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };\n  ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = document.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t; var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) };\n  ttq.load(${ref(V.tiktokId)});\n  ttq.page();\n}(window, document, 'ttq');`;

export function ga4TagEntries(ids: Ids) {
  const googleTag = {
    note: "Loads GA4 once per page, before everything else. It counts the first page view and, with Enhanced measurement on (see the guide), every page change. The server address is added only when 'AN - Server URL' holds an https address (phase 2).",
    item: {
      ...ids,
      tagId: "9001",
      name: "AN - Google tag (GA4)",
      type: "googtag",
      parameter: [
        template("tagId", ref(V.ga4Id)),
        {
          type: "LIST",
          key: "configSettingsTable",
          list: [{ type: "MAP", map: [template("parameter", "server_container_url"), template("parameterValue", ref(V.serverUrlOrNothing))] }],
        },
      ],
      fingerprint: FINGERPRINT,
      firingTriggerId: [BUILT_IN_INITIALIZATION],
      tagFiringOption: "ONCE_PER_LOAD",
      monitoringMetadata: { type: "MAP" },
      consentSettings: BUILT_IN_CONSENT,
    },
  };

  // One tag for every GA4 event, named by the event itself ({{Event}}): the site already pushes GA4's own event names with the
  // ecommerce object GA4 expects, so a tag per event would repeat the same settings ten times and could drift apart.
  const ga4Events = {
    note: `Sends ${GA4_EVENTS.join(", ")} to GA4 under their own names, with the ecommerce object from the data layer (items, value, currency, transaction_id, shipping). One tag instead of ten, so the settings cannot differ.`,
    item: {
      ...ids,
      tagId: "9002",
      name: "AN - GA4 - ecommerce and search events",
      type: "gaawe",
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
      fingerprint: FINGERPRINT,
      firingTriggerId: GA4_EVENTS.map(triggerId),
      tagFiringOption: "ONCE_PER_EVENT",
      monitoringMetadata: { type: "MAP" },
      consentSettings: BUILT_IN_CONSENT,
    },
  };

  return [googleTag, ga4Events];
}

const baseTriggers = () => [BUILT_IN_ALL_PAGES, triggerId("anaiza_consent_changed")];

export function metaTagEntries(ids: Ids) {
  return [
    htmlTag(ids, "9011", "AN - Meta Pixel - base + PageView", META_BASE, baseTriggers(), "Starts the Meta pixel and counts the first page view. Needs ad_storage; if the visitor allows marketing later, the consent event starts it then (once per page).", "ONCE_PER_LOAD"),
    htmlTag(ids, "9012", "AN - Meta Pixel - PageView (page change)", `if (window.fbq) { fbq('track', 'PageView'); }`, [triggerId("page_view")], "A page change inside the shop (the site pushes page_view)."),
    htmlTag(ids, "9013", "AN - Meta Pixel - ViewContent (product)", `(function () {\n  if (!window.fbq) return;\n  var i = ${first};\n  fbq('track', 'ViewContent', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("view_item")], "A product page."),
    htmlTag(ids, "9014", "AN - Meta Pixel - ViewContent (landing page)", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'ViewContent', { content_ids: ids, contents: contents.map(function (c, n) { return { id: c.id, quantity: 1, item_price: items[n].price }; }), content_type: 'product', currency: ${currency}, value: items.length ? Math.min.apply(null, items.map(function (i) { return i.price; })) : 0 });\n})();`, [landingTrigger.id], "A campaign landing page: one ViewContent listing its products, at the cheapest price (the same as the site's own pixel call)."),
    htmlTag(ids, "9015", "AN - Meta Pixel - AddToCart", `(function () {\n  if (!window.fbq) return;\n  var i = ${first};\n  fbq('track', 'AddToCart', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_to_cart")], "Add to cart."),
    htmlTag(ids, "9016", "AN - Meta Pixel - InitiateCheckout", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'InitiateCheckout', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)}, num_items: contents.reduce(function (n, c) { return n + c.quantity; }, 0) });\n})();`, [triggerId("begin_checkout")], "The checkout page opens with something in the cart."),
    htmlTag(ids, "9017", "AN - Meta Pixel - AddPaymentInfo", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  fbq('track', 'AddPaymentInfo', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_payment_info")], "A payment method is chosen."),
    htmlTag(ids, "9018", "AN - Meta Pixel - Purchase", `(function () {\n  if (!window.fbq) return;\n  ${metaItems}\n  var user = ${ref(V.metaUserData)};\n  if (user && typeof user === 'object') { fbq('init', ${ref(V.metaId)}, user); }\n  fbq('track', 'Purchase', { content_ids: ids, contents: contents, currency: ${currency}, value: ${ref(V.value)} }, { eventID: ${ref(V.eventId)} });\n})();`, [triggerId("purchase")], "A cash-on-delivery order is placed. eventID is order-<number>, the same id the shop's server sends to the Conversions API, so Meta counts the sale once. Hashed buyer details are used only when the visitor allowed marketing."),
  ];
}

export function tiktokTagEntries(ids: Ids) {
  return [
    htmlTag(ids, "9021", "AN - TikTok Pixel - base + page", TIKTOK_BASE, baseTriggers(), "Starts the TikTok pixel and counts the first page view. Needs ad_storage (see the Meta base tag).", "ONCE_PER_LOAD"),
    htmlTag(ids, "9022", "AN - TikTok Pixel - page (page change)", `if (window.ttq) { ttq.page(); }`, [triggerId("page_view")], "A page change inside the shop."),
    htmlTag(ids, "9023", "AN - TikTok Pixel - ViewContent (product)", `(function () {\n  if (!window.ttq) return;\n  var i = ${first};\n  ttq.track('ViewContent', { content_id: i.item_id, content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("view_item")], "A product page."),
    htmlTag(ids, "9024", "AN - TikTok Pixel - ViewContent (landing page)", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('ViewContent', { contents: contents, content_type: 'product', currency: ${currency}, value: items.length ? Math.min.apply(null, items.map(function (i) { return i.price; })) : 0 });\n})();`, [landingTrigger.id], "A campaign landing page."),
    htmlTag(ids, "9025", "AN - TikTok Pixel - AddToCart", `(function () {\n  if (!window.ttq) return;\n  var i = ${first};\n  ttq.track('AddToCart', { content_id: i.item_id, content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_to_cart")], "Add to cart."),
    htmlTag(ids, "9026", "AN - TikTok Pixel - InitiateCheckout", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('InitiateCheckout', { contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("begin_checkout")], "The checkout page opens with something in the cart."),
    htmlTag(ids, "9027", "AN - TikTok Pixel - AddPaymentInfo", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('AddPaymentInfo', { contents: contents, currency: ${currency}, value: ${ref(V.value)} });\n})();`, [triggerId("add_payment_info")], "A payment method is chosen."),
    htmlTag(ids, "9028", "AN - TikTok Pixel - CompletePayment (purchase)", `(function () {\n  if (!window.ttq) return;\n  ${tiktokItems}\n  ttq.track('CompletePayment', { content_type: 'product', contents: contents, currency: ${currency}, value: ${ref(V.value)} }, { event_id: ${ref(V.eventId)} });\n})();`, [triggerId("purchase")], "A cash-on-delivery order is placed. TikTok's CompletePayment is the event the shop's server sends too, with the same event_id (order-<number>), so TikTok counts the sale once."),
  ];
}

export const builtInVariables = (ids: Ids) =>
  [
    { type: "EVENT", name: "Event" },
    { type: "PAGE_URL", name: "Page URL" },
    { type: "PAGE_HOSTNAME", name: "Page Hostname" },
    { type: "PAGE_PATH", name: "Page Path" },
    { type: "REFERRER", name: "Referrer" },
  ].map((variable) => ({ ...ids, ...variable }));

// ---- Putting it together

type Contents = { tag: unknown[]; trigger: unknown[]; variable: unknown[]; builtInVariable: unknown[] };

/** The export file: the header as given (key order kept), with the container's contents put in. */
export function assemble(base: ExportFile | null, contents: Contents): ExportFile {
  const { file } = headerFrom(base);
  const version: Record<string, unknown> = {};

  // Whatever else the container already holds (its own custom templates, folders, clients) is not ours to put in the file.
  const notOurs = ["customTemplate", "folder", "client", "zone", "transformation"];

  for (const [key, value] of Object.entries(file.containerVersion)) {
    if (key in contents || notOurs.includes(key)) continue;
    version[key] = value;
  }

  // The contents go after the container block, where GTM writes them, and before the fingerprint and the link.
  const ordered: Record<string, unknown> = {};
  let placed = false;
  const put = () => {
    for (const key of ["tag", "trigger", "variable", "builtInVariable"] as const) ordered[key] = contents[key];
    placed = true;
  };

  for (const [key, value] of Object.entries(version)) {
    if (!placed && (key === "fingerprint" || key === "tagManagerUrl")) put();
    ordered[key] = value;
  }
  if (!placed) put();

  return { exportFormatVersion: file.exportFormatVersion, exportTime: file.exportTime, containerVersion: ordered };
}

const items = <T>(entries: { item: T }[]) => entries.map((entry) => entry.item);
const withoutConsent = (entries: { item: { consentSettings: unknown } }[]) => entries.map((entry) => ({ ...entry.item, consentSettings: BUILT_IN_CONSENT }));

/** The triggers the given tags fire on (the ones this container defines; the built-in ones are not in the file). */
function triggersFor(ids: Ids, tags: { item: { firingTriggerId: string[] } }[]) {
  const used = new Set(tags.flatMap((tag) => tag.item.firingTriggerId));

  return triggerEntries(ids).filter((entry) => used.has(entry.item.triggerId));
}

export function buildContainer(base: ExportFile | null = null): ExportFile {
  const { ids } = headerFrom(base);

  return assemble(base, {
    tag: items([...ga4TagEntries(ids), ...metaTagEntries(ids), ...tiktokTagEntries(ids)]),
    trigger: items(triggerEntries(ids)),
    variable: items(variableEntries(ids)),
    builtInVariable: builtInVariables(ids),
  });
}

/** The smaller files, in the order to import them. Each is a whole export that holds only its own part (plus the triggers its tags fire on). */
export function buildParts(base: ExportFile | null = null): { file: string; about: string; content: ExportFile }[] {
  const { ids } = headerFrom(base);
  const ga4 = ga4TagEntries(ids);
  const meta = metaTagEntries(ids);
  const tiktok = tiktokTagEntries(ids);
  const empty = { tag: [], trigger: [], variable: [], builtInVariable: [] };

  return [
    { file: "01-variables.json", about: "The constants, the Custom JavaScript variable and the Data Layer variables, and the built-in variables the container uses. Import this first: everything else refers to these by name.", content: assemble(base, { ...empty, variable: items(variableEntries(ids)), builtInVariable: builtInVariables(ids) }) },
    { file: "02-triggers.json", about: "The Custom Event triggers (one for each event the shop pushes, and one for landing pages). They refer to variables by name, so import 01 first.", content: assemble(base, { ...empty, trigger: items(triggerEntries(ids)), builtInVariable: builtInVariables(ids) }) },
    { file: "03-tags-ga4.json", about: "The Google tag and the one GA4 events tag, with the triggers they fire on.", content: assemble(base, { ...empty, tag: items(ga4), trigger: items(triggersFor(ids, ga4)), builtInVariable: builtInVariables(ids) }) },
    { file: "04-tags-meta.json", about: "The eight Meta Pixel tags, with the triggers they fire on.", content: assemble(base, { ...empty, tag: items(meta), trigger: items(triggersFor(ids, meta)), builtInVariable: builtInVariables(ids) }) },
    { file: "05-tags-tiktok.json", about: "The eight TikTok Pixel tags, with the triggers they fire on.", content: assemble(base, { ...empty, tag: items(tiktok), trigger: items(triggersFor(ids, tiktok)), builtInVariable: builtInVariables(ids) }) },
    // Diagnostics: the same tags with no consent requirement. The consent setting of a tag is the one shape here that GTM did not write in the real
    // export (all of its tags have none), so if 04 or 05 is refused and these are not, it is the consent setting: set it by hand (docs/gtm-manual-build.md).
    { file: "04-tags-meta.no-consent.json", about: "DIAGNOSTIC: the Meta tags exactly as 04, but with no consent requirement (set it by hand afterwards).", content: assemble(base, { ...empty, tag: withoutConsent(meta), trigger: items(triggersFor(ids, meta)), builtInVariable: builtInVariables(ids) }) },
    { file: "05-tags-tiktok.no-consent.json", about: "DIAGNOSTIC: the TikTok tags exactly as 05, but with no consent requirement (set it by hand afterwards).", content: assemble(base, { ...empty, tag: withoutConsent(tiktok), trigger: items(triggersFor(ids, tiktok)), builtInVariable: builtInVariables(ids) }) },
  ];
}

// ---- The by-hand version

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function manualBuildMarkdown(): string {
  const ids = { accountId: "0", containerId: "0" };
  const variables = variableEntries(ids);
  const triggers = triggerEntries(ids);
  const ga4 = ga4TagEntries(ids);
  const meta = metaTagEntries(ids);
  const tiktok = tiktokTagEntries(ids);
  const triggerName = (id: string) => triggerEntries(ids).find((entry) => entry.item.triggerId === id)?.item.name ?? (id === BUILT_IN_ALL_PAGES ? "All Pages (built-in, Page View)" : id === BUILT_IN_INITIALIZATION ? "Initialization - All Pages (built-in)" : id);
  const out: string[] = [];

  out.push("# Build the container by hand (if the import fails)", "");
  out.push("Generated by `node --no-warnings scripts/build-gtm-container.ts` from the same code as the import files, so it is exactly the same container. Every name starts with `AN - `.");
  out.push("Work in a **new workspace** of the web container `GTM-MS2HWSWF`. Create things in this order: built-in variables, variables, triggers, tags. Names must match **exactly** (copy them), because tags refer to variables by name.");
  out.push("");
  out.push("**Before you publish:** the container already holds nine tags (GA4 Configuration Tag, GA4 Page_view Tag, GA4 view_item Tag, GA4 begin_checkout Tag, GA4 purchase Tag, FB page_view Tag, FB ViewContent Tag, FB InitiateCheckout Tag, FB Purchase Tag). They fire on the same events as the tags below, so **pause or delete them** or every one of those events is counted twice. See `docs/tracking-setup-guide.md`, step 3a.", "");
  out.push("## 0. Built-in variables", "");
  out.push("Variables > *Configure* (under Built-In Variables) > tick: **Event**, **Page URL**, **Page Hostname**, **Page Path**, **Referrer**.", "");

  out.push("## 1. Variables", "", "Variables > *User-Defined Variables* > **New** > pick the type, name it, fill the fields, Save.", "");
  out.push("| # | Name | Type to pick | Fields | Value | Why |", "| --- | --- | --- | --- | --- | --- |");
  variables.forEach(({ item, note }, index) => {
    const typeName = item.type === "c" ? "Constant" : item.type === "v" ? "Data Layer Variable" : "Custom JavaScript";
    const p = item.parameter as Param[];
    const fields = item.type === "c" ? "Value" : item.type === "v" ? "Data Layer Variable Name; Data Layer Version = Version 2; Set Default Value = off" : "(the code below)";
    const value = item.type === "c" ? String(p[0].value) : item.type === "v" ? String(p[2].value) : "see 1a";
    out.push(`| ${index + 1} | \`${cell(item.name)}\` | ${typeName} | ${fields} | \`${cell(value)}\` | ${cell(note)} |`);
  });
  const jsVariable = variables.find((entry) => entry.item.type === "jsm");
  out.push("", "### 1a. The Custom JavaScript variable", "", `Name: \`${jsVariable?.item.name}\`. Paste this as the code:`, "", "```js", String((jsVariable?.item.parameter as Param[])[0].value), "```", "");

  out.push("## 2. Triggers", "", "Triggers > **New** > *Trigger Configuration* > **Custom Event**. *Event name* is the text in the table. Leave *Use regex matching* **off**. *This trigger fires on*: **All Custom Events**, unless the last column says otherwise.", "");
  out.push("| # | Name | Event name | Extra condition |", "| --- | --- | --- | --- |");
  triggers.forEach(({ item }, index) => {
    const event = (item.customEventFilter[0].parameter[1] as Param).value;
    const extra = "filter" in item ? "*This trigger fires on* **Some Custom Events**: `AN - DLV ecommerce.item_list_name` **starts with** `Landing page:`" : "none";
    out.push(`| ${index + 1} | \`${item.name}\` | \`${event}\` | ${extra} |`);
  });
  out.push("");

  const consentLine = (consent: { consentStatus: string }) => (consent.consentStatus === "NEEDED" ? "Advanced > Consent Settings > **Require additional consent for tag to fire** > add `ad_storage`" : "leave Consent Settings as they are (built in)");

  out.push("## 3. Tags", "");
  out.push("### 3a. Google tag and GA4 events", "");
  out.push("| Name | Tag type to pick | Fields | Fires on | Consent |", "| --- | --- | --- | --- | --- |");
  const googleTag = ga4[0].item;
  out.push(`| \`${googleTag.name}\` | **Google tag** | Tag ID: \`{{${V.ga4Id}}}\`. *Configuration settings* > add a row: **server_container_url** = \`{{${V.serverUrlOrNothing}}}\`. Tag firing option: **Once per page** | ${triggerName(googleTag.firingTriggerId[0])} | ${consentLine(googleTag.consentSettings)} |`);
  const eventsTag = ga4[1].item;
  out.push(`| \`${eventsTag.name}\` | **Google Analytics: GA4 Event** | *Measurement ID*: \`{{${V.ga4Id}}}\` (or choose the Google tag above). *Event Name*: \`{{Event}}\`. Under *More settings* > *Ecommerce*: tick **Send Ecommerce data**, *Data source* **Data Layer**. *Event parameters* > add a row: **search_term** = \`{{${V.searchTerm}}}\` | ${eventsTag.firingTriggerId.map(triggerName).map((name) => `\`${name}\``).join(", ")} (one tag, ten triggers: open the tag, click the trigger box and tick all ten) | ${consentLine(eventsTag.consentSettings)} |`);
  out.push("");

  const tagTable = (title: string, entries: ReturnType<typeof metaTagEntries>) => {
    out.push(`### ${title}`, "", "Tag type to pick for all of them: **Custom HTML**. Paste the code in the box (it already includes the `<script>` tags), leave *Support document.write* off.", "");
    out.push("| Name | Fires on | Tag firing option | Consent | Why |", "| --- | --- | --- | --- | --- |");
    for (const { item, note } of entries) {
      out.push(`| \`${item.name}\` | ${item.firingTriggerId.map(triggerName).map((name) => `\`${name}\``).join(" **and** ")} | ${item.tagFiringOption === "ONCE_PER_LOAD" ? "Once per page" : "Once per event"} | ${consentLine(item.consentSettings)} | ${cell(note)} |`);
    }
    out.push("");
    for (const { item } of entries) {
      out.push(`#### \`${item.name}\``, "", "```html", String((item.parameter as Param[])[0].value), "```", "");
    }
  };
  tagTable("3b. Meta Pixel tags", meta);
  tagTable("3c. TikTok Pixel tags", tiktok);

  out.push("## 4. After building", "", `- Variable \`${V.tiktokId}\`: replace \`${TIKTOK_PLACEHOLDER}\` with the real TikTok pixel ID.`, `- Variable \`${V.serverUrl}\`: leave \`${NO_SERVER}\` (phase 1).`, "- Press **Preview** and follow `docs/tracking-setup-guide.md` step 4.", "");

  return out.join("\n");
}
