// The web container, version 3 (docs/gtm-container-anaizanest-v3.json): version 2 plus the one fix found when the server container was tested.
//
// What the test showed (docs/server-container-guide.md, section 11): Meta's own pixel script (fbevents.js) listens to the browser history
// (pushState, replaceState, popstate) and, unless `fbq.disablePushState` is true, sends a PageView of its own on every page change -- with no
// eventID, so Meta cannot pair it with anything. The shop sends its own PageView with an eventID on every page (the tag "AN - Meta Pixel - init + PageView"),
// so each page change counted twice in the browser. Version 3 sets `fbq.disablePushState = true` right after the pixel is installed, in the two tags that
// install it. Nothing else changes: every other tag, trigger and variable is the one in version 2, byte for byte (gtmContainerV3.test.ts checks that).
//
// The extra GA4 `page_view` hits are NOT fixed here: they come from GA4's own Enhanced measurement setting ("Page changes based on browser history
// events"), which is a setting of the GA4 data stream and cannot be changed from a container file. See the guide.

import { assemble, builtInVariables, headerFrom, type ExportFile, type Ids } from "./gtmContainer.ts";
import { ga4TagEntriesV2, metaTagEntriesV2, triggerEntriesV2, variableEntriesV2 } from "./gtmContainerV2.ts";

/** Placed right after the pixel is installed, before it is started: the pixel reads it when it sets up its listening to the browser history. */
export const DISABLE_PUSH_STATE = "fbq.disablePushState = true;";

/** The two tags that install the pixel (the first start, and the start after the visitor allows marketing). */
export const PIXEL_INSTALLING_TAGS = ["9711", "9712"] as const;

// The line of version 2 that starts the pixel; the new line goes just before it.
const START = "if (!window._anMetaInit) {";

type Param = { type: string; key: string; value?: string };
type TagItem = { tagId: string; parameter: Param[] };

export function metaTagEntriesV3(ids: Ids): ReturnType<typeof metaTagEntriesV2> {
  return metaTagEntriesV2(ids).map((entry) => {
    const item = entry.item as unknown as TagItem;
    if (!(PIXEL_INSTALLING_TAGS as readonly string[]).includes(item.tagId)) return entry;

    const parameter = item.parameter.map((param) => {
      if (param.key !== "html") return param;
      const html = param.value ?? "";
      if (html.split(START).length !== 2) throw new Error(`tag ${item.tagId}: the pixel start line was not found exactly once`);

      return { ...param, value: html.replace(START, `${DISABLE_PUSH_STATE}\n${START}`) };
    });

    return {
      note: `${entry.note} Version 3: also tells the pixel not to send a PageView of its own on each page change (it would have no eventID).`,
      item: { ...entry.item, parameter } as typeof entry.item,
    };
  });
}

const items = <T>(entries: { item: T }[]) => entries.map((entry) => entry.item);

export function buildContainerV3(base: ExportFile | null = null): ExportFile {
  const { ids } = headerFrom(base);

  return assemble(base, {
    tag: items([...ga4TagEntriesV2(ids), ...metaTagEntriesV3(ids)]),
    trigger: items(triggerEntriesV2(ids)),
    variable: items(variableEntriesV2(ids)),
    builtInVariable: builtInVariables(ids),
  });
}

/**
 * The events the server container's Meta tag sends (its trigger "Meta - 6 events": Event Name matches RegEx). Not in it, so browser only on Meta: view_item_list (a
 * campaign landing page's ViewContent), view_cart, search, remove_from_cart, add_shipping_info. Written in docs/server-container-guide.md; a test keeps the two equal.
 */
export const SERVER_META_EVENT_PATTERN = "^(page_view|view_item|add_to_cart|begin_checkout|add_payment_info|purchase)$";
