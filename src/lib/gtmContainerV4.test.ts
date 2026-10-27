import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NO_SERVER, SITE_EVENTS, type ExportFile } from "./gtmContainer.ts";
import { buildContainerV3 } from "./gtmContainerV3.ts";
import { buildContainerV4, SERVER_META_EVENT_PATTERN_V4, V4_EVENTS } from "./gtmContainerV4.ts";
import { validateExport } from "./gtmValidate.ts";

const referencePath = new URL("../../docs/gtm-export-empty.json", import.meta.url);
const reference: ExportFile | null = existsSync(referencePath) ? (JSON.parse(readFileSync(referencePath, "utf8")) as ExportFile) : null;
const v3 = buildContainerV3(reference);
const v4 = buildContainerV4(reference);
const committed = JSON.parse(readFileSync(new URL("../../docs/gtm-container-anaizanest-v4.json", import.meta.url), "utf8"));

type Param = { type: string; key: string; value?: string; list?: { map: { key: string; value: string }[] }[] };
type Tag = { tagId: string; name: string; type: string; parameter: Param[]; firingTriggerId: string[]; consentSettings: { consentStatus: string; consentType?: { list: { value: string }[] } } };
type Trigger = { triggerId: string; name: string; customEventFilter: { parameter: { value: string }[] }[] };
type Variable = { variableId: string; name: string; parameter: Param[] };
type Version = { tag: Tag[]; trigger: Trigger[]; variable: Variable[]; builtInVariable: unknown[] };

const of = (file: ExportFile) => file.containerVersion as unknown as Version;
const html = (tag: Tag) => tag.parameter.find((param) => param.key === "html")?.value ?? "";
const rows = (tag: Tag) => Object.fromEntries((tag.parameter.find((param) => param.key === "eventSettingsTable")?.list ?? []).map((row) => [row.map[0].value, row.map[1].value]));
const tagNamed = (name: string) => of(v4).tag.find((tag) => tag.name === name) as Tag;
const eventOf = (id: string) => of(v4).trigger.find((trigger) => trigger.triggerId === id)?.customEventFilter[0].parameter[1].value as string;
const eventsOf = (tag: Tag) => tag.firingTriggerId.map(eventOf);

describe("the version 4 container file", () => {
  it("is exactly what the code builds (run: npm run gtm:build)", () => {
    assert.deepEqual(committed, JSON.parse(JSON.stringify(v4)));
  });

  it("parses, and the validator finds no error in it", () => {
    const errors = validateExport(committed, { reference: reference as never }).filter((finding) => finding.level === "error");

    assert.deepEqual(errors, []);
  });

  it("has seventeen tags (twelve in version 3), all starting AN - , with ids that cannot clash and names that are unique", () => {
    const { tag, trigger, variable } = of(v4);

    assert.equal(of(v3).tag.length, 12);
    assert.equal(tag.length, 17);
    for (const item of [...tag, ...trigger, ...variable] as unknown as Record<string, string>[]) {
      assert.ok(Number(item.tagId ?? item.triggerId ?? item.variableId) >= 9000, item.name);
      assert.ok(item.name.startsWith("AN - "), item.name);
    }
    const names = [...tag, ...trigger, ...variable].map((item) => item.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("resolves every reference: each trigger a tag fires on and each {{variable}}", () => {
    const variables = new Set([...of(v4).variable.map((variable) => variable.name), "Event", "_event", "Page URL", "Page Hostname", "Page Path", "Referrer"]);
    const triggers = new Set([...of(v4).trigger.map((trigger) => trigger.triggerId), "2147479553", "2147479573"]);

    for (const tag of of(v4).tag) for (const id of tag.firingTriggerId) assert.ok(triggers.has(id), `${tag.name}: trigger ${id}`);
    for (const match of JSON.stringify(v4).matchAll(/\{\{([^}]+)\}\}/g)) assert.ok(variables.has(match[1]), `${match[1]} exists`);
  });
});

describe("only what changed since version 3", () => {
  const a = of(v3);
  const b = of(v4);

  it("changes five tags and adds five; every other tag is version 3, byte for byte", () => {
    const old = new Map(a.tag.map((tag) => [tag.tagId, JSON.stringify(tag)]));
    const changed = b.tag.filter((tag) => old.has(tag.tagId) && old.get(tag.tagId) !== JSON.stringify(tag)).map((tag) => tag.tagId);
    const added = b.tag.filter((tag) => !old.has(tag.tagId)).map((tag) => tag.tagId);

    assert.deepEqual(changed.sort(), ["9702", "9703", "9704", "9711", "9712"]);
    assert.deepEqual(added.sort(), ["9705", "9719", "9720", "9721", "9722"]);
    assert.deepEqual(a.tag.map((tag) => tag.tagId).filter((id) => !b.tag.some((tag) => tag.tagId === id)), [], "nothing is removed");
  });

  it("adds four triggers and one variable, and keeps all the others", () => {
    assert.deepEqual(b.trigger.slice(0, a.trigger.length), a.trigger);
    assert.deepEqual(b.trigger.slice(a.trigger.length).map((trigger) => eventOf(trigger.triggerId)), [...V4_EVENTS]);
    assert.deepEqual(b.variable.slice(0, a.variable.length), a.variable);
    assert.deepEqual(b.variable.slice(a.variable.length).map((variable) => variable.name), ["AN - DLV method"]);
    assert.deepEqual(b.builtInVariable, a.builtInVariable);
  });

  it("keeps AN - Server URL (NONE in the file) and the Google tag exactly as in version 3", () => {
    const server = (file: Version) => file.variable.find((variable) => variable.name === "AN - Server URL");

    assert.deepEqual(server(b), server(a));
    assert.equal(server(b)?.parameter.find((param) => param.key === "value")?.value, NO_SERVER);
    assert.deepEqual(tagNamed("AN - Google tag (GA4)"), a.tag.find((tag) => tag.name === "AN - Google tag (GA4)"));
  });
});

describe("the visitor's id on every event", () => {
  const externalId = "{{AN - DLV user_data.external_id}}";

  it("every GA4 event tag sends external_id and the event_id", () => {
    const ga4 = of(v4).tag.filter((tag) => tag.type === "gaawe");

    assert.deepEqual(ga4.map((tag) => tag.tagId).sort(), ["9702", "9703", "9704", "9705"]);
    for (const tag of ga4) {
      assert.equal(rows(tag).external_id, externalId, tag.name);
      assert.equal(rows(tag).event_id, "{{AN - DLV event_id}}", tag.name);
    }
  });

  it("the GA4 tags cover every event the shop pushes, the new ones included", () => {
    const sent = new Set(of(v4).tag.filter((tag) => tag.type === "gaawe").flatMap(eventsOf));
    const pushed = [...SITE_EVENTS, ...V4_EVENTS].filter((event) => !["order_pending_payment", "anaiza_consent_changed", "anaiza_identity_changed"].includes(event));

    for (const event of pushed) assert.ok(sent.has(event), `GA4 gets ${event}`);
    assert.ok(!sent.has("order_pending_payment") && !sent.has("anaiza_identity_changed"));
  });

  it("the Meta pixel is started with external_id as advanced matching, once, and again only when it first becomes known", () => {
    for (const name of ["AN - Meta Pixel - init + PageView", "AN - Meta Pixel - init after consent"]) {
      const text = html(tagNamed(name));

      assert.ok(text.includes("var anExt = {{AN - DLV user_data.external_id}};"), name);
      assert.ok(text.includes("fbq('init', {{AN - Meta Pixel ID}}, { external_id: anExt })"), name);
      assert.ok(text.includes("!window._anMetaInit || (anExt && !window._anMetaExt)"), `${name}: the guard against starting twice`);
      assert.ok(text.includes("fbq.disablePushState = true;"), `${name}: still version 3's fix`);
      assert.equal(text.split("window._anMetaInit = true").length, 2, name);
    }
  });

  it("the tag that runs when marketing is allowed also runs when the visitor's id changes", () => {
    assert.deepEqual(eventsOf(tagNamed("AN - Meta Pixel - init after consent")), ["anaiza_consent_changed", "anaiza_identity_changed"]);
    assert.ok(!/fbq\('track'/.test(html(tagNamed("AN - Meta Pixel - init after consent"))), "and still sends nothing itself");
  });
});

describe("the new events", () => {
  // GA4 event, the Meta tag, the Meta event, and what the tag sends.
  const table: [string, string, string, string][] = [
    ["search", "AN - Meta Pixel - Search", "Search", "search_string: {{AN - DLV search_term}}"],
    ["generate_lead", "AN - Meta Pixel - Lead (WhatsApp or phone)", "Lead", "content_name: {{AN - DLV method}}"],
    ["add_to_wishlist", "AN - Meta Pixel - AddToWishlist", "AddToWishlist", "content_ids: [i.item_id]"],
    ["sign_up", "AN - Meta Pixel - CompleteRegistration", "CompleteRegistration", "status: true"],
  ];

  for (const [event, name, metaEvent, detail] of table) {
    it(`${event} becomes Meta ${metaEvent}, with eventID = its event_id, and waits for marketing consent`, () => {
      const tag = tagNamed(name);

      assert.ok(html(tag).includes(`fbq('track', '${metaEvent}'`));
      assert.ok(html(tag).includes(detail), detail);
      assert.ok(html(tag).includes("{ eventID: {{AN - DLV event_id}} }"));
      assert.deepEqual(eventsOf(tag), [event]);
      assert.equal(tag.consentSettings.consentStatus, "NEEDED");
      assert.deepEqual(tag.consentSettings.consentType?.list.map((item) => item.value), ["ad_storage"]);
    });
  }

  it("generate_lead and sign_up go to GA4 under their own names with the method; add_to_wishlist through the ecommerce tag", () => {
    const lead = tagNamed("AN - GA4 - lead and sign_up");

    assert.deepEqual(eventsOf(lead).sort(), ["generate_lead", "sign_up"]);
    assert.equal(lead.parameter.find((param) => param.key === "eventName")?.value, "{{Event}}");
    assert.equal(rows(lead).method, "{{AN - DLV method}}");
    assert.ok(eventsOf(tagNamed("AN - GA4 - ecommerce events")).includes("add_to_wishlist"));
    assert.equal(tagNamed("AN - GA4 - ecommerce events").parameter.find((param) => param.key === "sendEcommerceData")?.value, "true");
  });
});

describe("the server container's Meta trigger", () => {
  const pattern = new RegExp(SERVER_META_EVENT_PATTERN_V4);
  const metaTags = () => of(v4).tag.filter((tag) => /fbq\('track'/.test(html(tag)));
  const metaEvents = () => new Set(metaTags().flatMap(eventsOf));

  it("is the ten events and nothing else", () => {
    assert.equal(SERVER_META_EVENT_PATTERN_V4, "^(page_view|view_item|add_to_cart|begin_checkout|add_payment_info|purchase|search|generate_lead|add_to_wishlist|sign_up)$");
    for (const event of ["page_view", "view_item", "add_to_cart", "begin_checkout", "add_payment_info", "purchase", "search", "generate_lead", "add_to_wishlist", "sign_up"]) assert.ok(pattern.test(event), event);
    for (const event of ["view_item_list", "view_cart", "remove_from_cart", "add_shipping_info", "anaiza_identity_changed", "scroll", "page_view_x", "xsearch"]) assert.ok(!pattern.test(event), event);
  });

  it("every event it lets through has a browser Meta tag with the same event_id, so the pair is deduplicated", () => {
    for (const event of ["page_view", "view_item", "add_to_cart", "begin_checkout", "add_payment_info", "purchase", "search", "generate_lead", "add_to_wishlist", "sign_up"]) {
      assert.ok(metaEvents().has(event), `${event} has a browser tag`);
    }
    for (const tag of metaTags()) assert.ok(html(tag).includes("{ eventID: {{AN - DLV event_id}} }"), tag.name);
  });

  it("the browser-only Meta event is the campaign landing page's ViewContent (view_item_list)", () => {
    const browserOnly = [...metaEvents()].filter((event) => !pattern.test(event));

    assert.deepEqual(browserOnly, ["view_item_list"]);
  });

  it("the guide shows the same pattern", () => {
    const guide = readFileSync(new URL("../../docs/server-container-guide.md", import.meta.url), "utf8");

    assert.ok(guide.includes(SERVER_META_EVENT_PATTERN_V4));
  });
});

describe("the catalogue ids", () => {
  it("every Meta tag that names products uses the SKU (the item_id) as content_ids, and content_type product", () => {
    const withIds = of(v4).tag.filter((tag) => /content_ids/.test(html(tag)));

    assert.deepEqual(withIds.map((tag) => tag.name).sort(), [
      "AN - Meta Pixel - AddPaymentInfo",
      "AN - Meta Pixel - AddToCart",
      "AN - Meta Pixel - AddToWishlist",
      "AN - Meta Pixel - InitiateCheckout",
      "AN - Meta Pixel - Purchase",
      "AN - Meta Pixel - ViewContent (landing page)",
      "AN - Meta Pixel - ViewContent (product)",
    ]);
    for (const tag of withIds) {
      assert.ok(/item_id/.test(html(tag)), `${tag.name}: ids come from item_id`);
      assert.ok(html(tag).includes("content_type: 'product'"), `${tag.name}: content_type product`);
    }
  });
});
