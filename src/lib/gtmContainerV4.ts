// The web container, version 4 (docs/gtm-container-anaizanest-v4.json): version 3 plus the visitor's id on every event and four more events for Meta.
//
// What is different from version 3 (src/lib/gtmContainerV3.ts), and nothing else:
//   - external_id: every GA4 event carries the visitor's hashed id (the page_view and search tags gain the parameter; the ecommerce tag already had it, and the
//     new tags have it). The Meta pixel is started with it as advanced matching (`fbq('init', id, { external_id })`) as soon as the page knows it. A pixel that is
//     already running without one is started again with it; one that already has an id keeps it (Meta ignores a second id), so a visitor who signs in on a page
//     they had open keeps the guest id in the browser until the next page load. The server container and the shop's own server use the right id per event.
//   - four new events from the shop, each with its Meta tag and, for GA4, a tag (or an added trigger):
//       search          -> Meta Search           (GA4 search tag, as before, plus external_id)
//       generate_lead   -> Meta Lead             (a tap on a WhatsApp or phone link; method: whatsapp | phone)
//       add_to_wishlist -> Meta AddToWishlist    (the heart; the product as in add_to_cart)
//       sign_up         -> Meta CompleteRegistration (a new account; method: email | google)
//   - one more event for the container only, `anaiza_identity_changed` (the visitor signed in or out, or got an id after allowing marketing): the tag that starts the
//     pixel listens to it too.
// Everything else (the Google tag, `AN - Server URL`, the other tags, triggers and variables) is version 3, byte for byte (gtmContainerV4.test.ts checks that).

import {
  assemble,
  builtInVariables,
  currency,
  dataLayerVariable,
  first,
  FINGERPRINT,
  headerFrom,
  htmlTag,
  ref,
  template,
  triggerId as v1TriggerId,
  type ExportFile,
  type Ids,
} from "./gtmContainer.ts";
import { ga4TagEntriesV2, triggerEntriesV2, V, variableEntriesV2 } from "./gtmContainerV2.ts";
import { metaTagEntriesV3, PIXEL_INSTALLING_TAGS } from "./gtmContainerV3.ts";

/** The events version 4 adds to what version 1 to 3 know. The shop pushes them (src/lib/tracking.ts); the container needs a trigger for each. */
export const V4_EVENTS = ["generate_lead", "add_to_wishlist", "sign_up", "anaiza_identity_changed"] as const;

const V4_TRIGGER_IDS: Record<(typeof V4_EVENTS)[number], string> = { generate_lead: "9214", add_to_wishlist: "9215", sign_up: "9216", anaiza_identity_changed: "9217" };

const triggerId = (event: string): string => V4_TRIGGER_IDS[event as (typeof V4_EVENTS)[number]] ?? v1TriggerId(event);

/** The server container's Meta trigger ("Meta - 6 events" in version 3, now 10): Event Name matches this RegEx. Written in docs/server-container-guide.md. */
export const SERVER_META_EVENT_PATTERN_V4 = "^(page_view|view_item|add_to_cart|begin_checkout|add_payment_info|purchase|search|generate_lead|add_to_wishlist|sign_up)$";

export const V4 = { ...V, method: "AN - DLV method" } as const;

const row = (name: string, value: string) => ({ type: "MAP", map: [template("parameter", name), template("parameterValue", value)] });

type Param = { type: string; key: string; value?: string; list?: unknown[] };
type TagItem = { tagId: string; parameter: Param[]; firingTriggerId: string[] };

const eventRows = (tag: TagItem): unknown[] => tag.parameter.find((param) => param.key === "eventSettingsTable")?.list ?? [];

export function variableEntriesV4(ids: Ids) {
  return [
    ...variableEntriesV2(ids),
    dataLayerVariable(ids, "9628", V4.method, "method", "generate_lead and sign_up: how (whatsapp or phone; email or google)."),
  ];
}

export function triggerEntriesV4(ids: Ids) {
  return [
    ...triggerEntriesV2(ids),
    ...V4_EVENTS.map((event) => ({
      note: `The data layer event ${event}.`,
      item: {
        ...ids,
        triggerId: V4_TRIGGER_IDS[event],
        name: `AN - CE ${event}`,
        type: "CUSTOM_EVENT",
        customEventFilter: [{ type: "EQUALS", parameter: [template("arg0", "{{_event}}"), template("arg1", event)] }],
        fingerprint: FINGERPRINT,
      },
    })),
  ];
}

export function ga4TagEntriesV4(ids: Ids) {
  const externalId = row("external_id", ref(V.userExternalId));

  const entries = ga4TagEntriesV2(ids).map((entry) => {
    const item = entry.item as unknown as TagItem;

    // The page_view and search tags gain the visitor's hashed id; the ecommerce tag has it already and gains the wishlist event.
    if (item.tagId === "9702" || item.tagId === "9703") {
      return {
        note: entry.note,
        item: {
          ...entry.item,
          parameter: item.parameter.map((param) => (param.key === "eventSettingsTable" ? { ...param, list: [...eventRows(item), externalId] } : param)),
        },
      };
    }

    if (item.tagId === "9704") {
      return {
        note: `${entry.note} Version 4: also add_to_wishlist.`,
        item: { ...entry.item, firingTriggerId: [...item.firingTriggerId, triggerId("add_to_wishlist")] },
      };
    }

    return entry;
  });

  const leadAndSignUp = {
    note: "A tap on a WhatsApp or phone link (generate_lead) and a new account (sign_up), under their own names, with how it happened (method), the event_id and the visitor's hashed id.",
    item: {
      ...ids,
      tagId: "9705",
      name: "AN - GA4 - lead and sign_up",
      type: "gaawe",
      parameter: [
        { type: "BOOLEAN", key: "sendEcommerceData", value: "false" },
        { type: "LIST", key: "eventSettingsTable", list: [row("event_id", ref(V.eventId)), row("method", ref(V4.method)), externalId] },
        template("eventName", "{{Event}}"),
        template("measurementIdOverride", ref(V.ga4Id)),
      ],
      fingerprint: FINGERPRINT,
      firingTriggerId: [triggerId("generate_lead"), triggerId("sign_up")],
      tagFiringOption: "ONCE_PER_EVENT",
      monitoringMetadata: { type: "MAP" },
      consentSettings: { consentStatus: "NOT_SET" },
    },
  };

  return [...entries, leadAndSignUp];
}

// The line of version 2 that starts the pixel (kept by version 3), and what starts it in version 4: with the visitor's hashed id when the page has it.
const START_V3 = "if (!window._anMetaInit) { fbq('init', {{AN - Meta Pixel ID}}); window._anMetaInit = true; }";
const START_V4 = [
  "var anExt = {{AN - DLV user_data.external_id}};",
  "if (!window._anMetaInit || (anExt && !window._anMetaExt)) {",
  "  if (anExt) { fbq('init', {{AN - Meta Pixel ID}}, { external_id: anExt }); } else { fbq('init', {{AN - Meta Pixel ID}}); }",
  "  window._anMetaInit = true;",
  "  window._anMetaExt = anExt || '';",
  "}",
].join("\n");

const withId = `{ eventID: ${ref(V.eventId)} }`;

export function metaTagEntriesV4(ids: Ids) {
  const starters = metaTagEntriesV3(ids).map((entry) => {
    const item = entry.item as unknown as TagItem;
    if (!(PIXEL_INSTALLING_TAGS as readonly string[]).includes(item.tagId)) return entry;

    const parameter = item.parameter.map((param) => {
      if (param.key !== "html") return param;
      const html = param.value ?? "";
      if (html.split(START_V3).length !== 2) throw new Error(`tag ${item.tagId}: the pixel start line was not found exactly once`);

      return { ...param, value: html.replace(START_V3, START_V4) };
    });

    // The tag that runs when marketing is allowed also runs when the visitor's id changes (they signed in, or got an id), so the pixel can be started with it.
    const firing = item.tagId === "9712" ? [...item.firingTriggerId, triggerId("anaiza_identity_changed")] : item.firingTriggerId;

    return {
      note: `${entry.note} Version 4: the pixel is started with the visitor's hashed external_id when the page has it${item.tagId === "9712" ? ", and this tag also runs when the visitor's id changes" : ""}.`,
      item: { ...entry.item, parameter, firingTriggerId: firing },
    };
  });

  const guard = "(function () {\n  if (!window.fbq) return;\n";
  const tag = (n: number, name: string, code: string, firing: string[], note: string) => htmlTag(ids, String(9710 + n), name, code, firing, note);

  return [
    ...starters,
    tag(9, "AN - Meta Pixel - Search", `${guard}  fbq('track', 'Search', { search_string: ${ref(V.searchTerm)}, content_type: 'product' }, ${withId});\n})();`, [triggerId("search")], "A search on the shop page (Meta's Search)."),
    tag(10, "AN - Meta Pixel - Lead (WhatsApp or phone)", `${guard}  fbq('track', 'Lead', { content_name: ${ref(V4.method)}, content_category: 'contact' }, ${withId});\n})();`, [triggerId("generate_lead")], "A tap on the WhatsApp or phone link (Meta's Lead); the method is whatsapp or phone."),
    tag(11, "AN - Meta Pixel - AddToWishlist", `${guard}  var i = ${first};\n  fbq('track', 'AddToWishlist', { content_ids: [i.item_id], content_name: i.item_name, content_type: 'product', currency: ${currency}, value: ${ref(V.value)} }, ${withId});\n})();`, [triggerId("add_to_wishlist")], "The heart on a product (Meta's AddToWishlist)."),
    tag(12, "AN - Meta Pixel - CompleteRegistration", `${guard}  fbq('track', 'CompleteRegistration', { content_name: ${ref(V4.method)}, status: true }, ${withId});\n})();`, [triggerId("sign_up")], "A new account (Meta's CompleteRegistration); the method is email or google."),
  ];
}

const items = <T>(entries: { item: T }[]) => entries.map((entry) => entry.item);

export function buildContainerV4(base: ExportFile | null = null): ExportFile {
  const { ids } = headerFrom(base);

  return assemble(base, {
    tag: items([...ga4TagEntriesV4(ids), ...metaTagEntriesV4(ids)]),
    trigger: items(triggerEntriesV4(ids)),
    variable: items(variableEntriesV4(ids)),
    builtInVariable: builtInVariables(ids),
  });
}
