import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NO_SERVER, type ExportFile } from "./gtmContainer.ts";
import { buildContainerV2 } from "./gtmContainerV2.ts";
import { buildContainerV3, DISABLE_PUSH_STATE, PIXEL_INSTALLING_TAGS, SERVER_META_EVENT_PATTERN } from "./gtmContainerV3.ts";
import { validateExport } from "./gtmValidate.ts";

const referencePath = new URL("../../docs/gtm-export-empty.json", import.meta.url);
const reference: ExportFile | null = existsSync(referencePath) ? (JSON.parse(readFileSync(referencePath, "utf8")) as ExportFile) : null;
const v2 = buildContainerV2(reference);
const v3 = buildContainerV3(reference);
const committed = JSON.parse(readFileSync(new URL("../../docs/gtm-container-anaizanest-v3.json", import.meta.url), "utf8"));

type Param = { type: string; key: string; value?: string; list?: { map: { key: string; value: string }[] }[] };
type Tag = { tagId: string; name: string; parameter: Param[]; firingTriggerId: string[] };
type Trigger = { triggerId: string; name: string; customEventFilter: { parameter: { value: string }[] }[]; filter?: unknown };
type Version = { tag: Tag[]; trigger: Trigger[]; variable: { name: string; parameter: Param[] }[]; builtInVariable: unknown[] };

const of = (file: ExportFile) => file.containerVersion as unknown as Version;
const html = (tag: Tag) => tag.parameter.find((param) => param.key === "html")?.value ?? "";
const tagNamed = (name: string) => of(v3).tag.find((tag) => tag.name === name) as Tag;
const eventOf = (id: string) => of(v3).trigger.find((trigger) => trigger.triggerId === id)?.customEventFilter[0].parameter[1].value;

describe("the version 3 container file", () => {
  it("is exactly what the code builds (run: npm run gtm:build)", () => {
    assert.deepEqual(committed, JSON.parse(JSON.stringify(v3)));
  });

  it("parses, and the validator finds no error in it", () => {
    const errors = validateExport(committed, { reference: reference as never }).filter((finding) => finding.level === "error");

    assert.deepEqual(errors, []);
  });

  it("differs from version 2 in the two pixel-installing tags only", () => {
    const a = of(v2);
    const b = of(v3);

    assert.equal(a.tag.length, b.tag.length);
    const changed = b.tag.filter((tag, index) => JSON.stringify(tag) !== JSON.stringify(a.tag[index])).map((tag) => tag.tagId);
    assert.deepEqual(changed, [...PIXEL_INSTALLING_TAGS]);
    assert.deepEqual(b.trigger, a.trigger);
    assert.deepEqual(b.variable, a.variable);
    assert.deepEqual(b.builtInVariable, a.builtInVariable);
  });

  it("tells the pixel not to send its own PageView on a page change, after it is installed and before it starts", () => {
    for (const id of PIXEL_INSTALLING_TAGS) {
      const tag = of(v3).tag.find((item) => item.tagId === id) as Tag;
      const text = html(tag);

      assert.equal(text.split(DISABLE_PUSH_STATE).length, 2, `${tag.name}: once`);
      assert.ok(text.indexOf("fbevents.js") < text.indexOf(DISABLE_PUSH_STATE), `${tag.name}: after the install`);
      assert.ok(text.indexOf(DISABLE_PUSH_STATE) < text.indexOf("fbq('init'"), `${tag.name}: before init`);
    }
    // And no other tag needs it: they only call fbq() on a pixel that is already running.
    for (const tag of of(v3).tag.filter((item) => !(PIXEL_INSTALLING_TAGS as readonly string[]).includes(item.tagId))) assert.ok(!html(tag).includes("disablePushState"), tag.name);
  });
});

describe("one PageView per page, with the page's own id", () => {
  it("only the first tag counts a PageView, on the page_view event, with eventID = the event's event_id", () => {
    const withPageView = of(v3).tag.filter((tag) => /track'\s*,\s*'PageView'/.test(html(tag)));

    assert.deepEqual(withPageView.map((tag) => tag.name), ["AN - Meta Pixel - init + PageView"]);
    assert.ok(html(withPageView[0]).includes("{ eventID: {{AN - DLV event_id}} }"));
    assert.deepEqual(withPageView[0].firingTriggerId.map(eventOf), ["page_view"]);
  });

  it("the tag that runs when the visitor allows marketing sends nothing: it only starts the pixel", () => {
    const text = html(tagNamed("AN - Meta Pixel - init after consent"));

    assert.ok(!/fbq\('track'/.test(text));
    assert.ok(!/PageView/.test(text.replace(DISABLE_PUSH_STATE, "")));
    assert.deepEqual(tagNamed("AN - Meta Pixel - init after consent").firingTriggerId.map(eventOf), ["anaiza_consent_changed"]);
  });

  it("the Google tag does not send a page_view of its own, and the server address is NONE until it is set", () => {
    const google = tagNamed("AN - Google tag (GA4)");
    const rows = google.parameter.find((param) => param.key === "configSettingsTable")?.list ?? [];
    const settings = Object.fromEntries(rows.map((row) => [row.map[0].value, row.map[1].value]));
    const server = of(v3).variable.find((variable) => variable.name === "AN - Server URL");

    assert.equal(settings.send_page_view, "false");
    assert.equal(server?.parameter.find((param) => param.key === "value")?.value, NO_SERVER);
  });

  it("the GA4 page_view tag fires once per page_view event and sends the event_id", () => {
    const tag = tagNamed("AN - GA4 - page_view");
    const rows = tag.parameter.find((param) => param.key === "eventSettingsTable")?.list ?? [];

    assert.deepEqual(tag.firingTriggerId.map(eventOf), ["page_view"]);
    assert.ok(rows.some((row) => row.map[0].value === "event_id" && row.map[1].value === "{{AN - DLV event_id}}"));
    assert.equal(tag.parameter.find((param) => param.key === "eventName")?.value, "page_view");
  });
});

describe("every browser event shares its id with the server's", () => {
  // The Meta tag, the data layer event it fires on, and whether the server container's Meta tag sends the same event.
  const table: [string, string, boolean][] = [
    ["AN - Meta Pixel - init + PageView", "page_view", true],
    ["AN - Meta Pixel - ViewContent (product)", "view_item", true],
    ["AN - Meta Pixel - AddToCart", "add_to_cart", true],
    ["AN - Meta Pixel - InitiateCheckout", "begin_checkout", true],
    ["AN - Meta Pixel - AddPaymentInfo", "add_payment_info", true],
    ["AN - Meta Pixel - Purchase", "purchase", true],
    // A campaign landing page pushes view_item_list, which the server container's Meta trigger does not include: browser only.
    ["AN - Meta Pixel - ViewContent (landing page)", "view_item_list", false],
  ];

  for (const [name, event, onServer] of table) {
    it(`${name}: eventID = the ${event} event's event_id${onServer ? "" : " (browser only)"}`, () => {
      const tag = tagNamed(name);

      assert.ok(html(tag).includes("{ eventID: {{AN - DLV event_id}} }"), "eventID is the event_id");
      assert.deepEqual(tag.firingTriggerId.map(eventOf), [event]);
      assert.equal(new RegExp(SERVER_META_EVENT_PATTERN).test(event), onServer);
    });
  }

  it("the server's Meta trigger pattern is the six events and nothing else", () => {
    const pattern = new RegExp(SERVER_META_EVENT_PATTERN);

    for (const event of ["page_view", "view_item", "add_to_cart", "begin_checkout", "add_payment_info", "purchase"]) assert.ok(pattern.test(event), event);
    for (const event of ["view_item_list", "view_cart", "search", "remove_from_cart", "add_shipping_info", "page_view_x", "xpage_view", "scroll", "user_engagement"]) assert.ok(!pattern.test(event), event);
  });

  it("the guide shows the same pattern", () => {
    const guide = readFileSync(new URL("../../docs/server-container-guide.md", import.meta.url), "utf8");

    assert.ok(guide.includes(SERVER_META_EVENT_PATTERN));
  });
});
