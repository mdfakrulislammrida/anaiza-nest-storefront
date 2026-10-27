import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { GA4_MEASUREMENT_ID, META_PIXEL_ID, NO_SERVER, SITE_EVENTS, type ExportFile } from "./gtmContainer.ts";
import { buildContainerV2, GA4_ECOMMERCE_EVENTS } from "./gtmContainerV2.ts";
import { validateExport } from "./gtmValidate.ts";

const referencePath = new URL("../../docs/gtm-export-empty.json", import.meta.url);
const reference: ExportFile | null = existsSync(referencePath) ? (JSON.parse(readFileSync(referencePath, "utf8")) as ExportFile) : null;
const built = buildContainerV2(reference);
const committed = JSON.parse(readFileSync(new URL("../../docs/gtm-container-anaizanest-v2.json", import.meta.url), "utf8"));
const version = built.containerVersion as unknown as { tag: Tag[]; trigger: Trigger[]; variable: Variable[] };

type Param = { type: string; key: string; value?: string; list?: { map: { key: string; value: string }[] }[] };
type Tag = { tagId: string; name: string; type: string; parameter: Param[]; firingTriggerId: string[]; consentSettings: { consentStatus: string; consentType?: unknown }; tagFiringOption: string };
type Trigger = { triggerId: string; name: string; customEventFilter: { parameter: { value: string }[] }[] };
type Variable = { variableId: string; name: string; type: string; parameter: Param[] };

const html = (tag: Tag) => tag.parameter.find((p) => p.key === "html")?.value ?? "";
const rows = (tag: Tag) => Object.fromEntries((tag.parameter.find((p) => p.key === "eventSettingsTable")?.list ?? []).map((row) => [row.map[0].value, row.map[1].value]));
const eventOf = (id: string) => version.trigger.find((trigger) => trigger.triggerId === id)?.customEventFilter[0].parameter[1].value;
const tagNamed = (name: string) => version.tag.find((tag) => tag.name === name) as Tag;

describe("the version 2 container file", () => {
  it("is exactly what the code builds (run: npm run gtm:build)", () => {
    assert.deepEqual(committed, JSON.parse(JSON.stringify(built)));
  });

  it("parses, and the validator finds no error in it", () => {
    const errors = validateExport(committed, { reference: reference as never }).filter((finding) => finding.level === "error");

    assert.deepEqual(errors, []);
  });

  it("has ids that cannot clash with the container's own or with version 1's, unique names, and the AN - prefix", () => {
    for (const item of [...version.tag, ...version.trigger, ...version.variable] as unknown as Record<string, string>[]) {
      assert.ok(Number(item.tagId ?? item.triggerId ?? item.variableId) >= 9000, item.name);
      assert.ok(item.name.startsWith("AN - "), item.name);
    }
    const names = [...version.tag, ...version.trigger, ...version.variable].map((item) => item.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("resolves every reference: each trigger a tag fires on, each {{variable}}, and nothing points at a tag", () => {
    const variables = new Set([...version.variable.map((variable) => variable.name), "Event", "_event", "Page URL", "Page Hostname", "Page Path", "Referrer"]);
    const triggers = new Set([...version.trigger.map((trigger) => trigger.triggerId), "2147479553", "2147479573"]);

    for (const tag of version.tag) for (const id of tag.firingTriggerId) assert.ok(triggers.has(id), `${tag.name}: trigger ${id}`);
    for (const match of JSON.stringify(built).matchAll(/\{\{([^}]+)\}\}/g)) assert.ok(variables.has(match[1]), `${match[1]} exists`);
    assert.ok(!JSON.stringify(built).includes("TAG_REFERENCE"));
    // Every trigger and variable is used by something, or is one of the shop's events (a trigger for an event no tag needs is harmless).
    for (const variable of version.variable) {
      if (variable.name === "AN - Server URL") continue;
      assert.ok(JSON.stringify([version.tag, version.trigger, version.variable]).includes(`{{${variable.name}}}`) || variable.type === "v", variable.name);
    }
  });

  it("has a trigger for every event the shop pushes", () => {
    const events = version.trigger.map((trigger) => trigger.customEventFilter[0].parameter[1].value);

    for (const event of SITE_EVENTS) assert.ok(events.includes(event), event);
  });
});

describe("version 2 has no TikTok and no secrets", () => {
  it("leaves out every TikTok tag and variable", () => {
    const text = JSON.stringify(built).toLowerCase();

    assert.ok(!text.includes("tiktok") && !text.includes("ttq") && !text.includes("replace_with"));
  });

  it("holds no token, no key and no server address of its own", () => {
    const text = JSON.stringify(built);

    for (const word of ["access_token", "Access-Token", "EAA", "secret", "password", "api_key", "test_event_code", "TEST1", "stape.io", "usv.", "metrics.anaizanest", "sgtm."]) {
      assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `no "${word}"`);
    }
  });

  it("keeps the ids: GA4 G-1V0Q6EN05B, Meta 956723840598016, and the server address as NONE (the only place it is kept)", () => {
    const constants = Object.fromEntries(version.variable.filter((v) => v.type === "c").map((v) => [v.name, v.parameter[0].value]));

    assert.deepEqual(constants, { "AN - GA4 Measurement ID": GA4_MEASUREMENT_ID, "AN - Meta Pixel ID": META_PIXEL_ID, "AN - Server URL": NO_SERVER });
    assert.equal(GA4_MEASUREMENT_ID, "G-1V0Q6EN05B");
    assert.equal(META_PIXEL_ID, "956723840598016");
  });
});

describe("GA4 goes through the server container, and straight to Google while the address is NONE", () => {
  const google = () => tagNamed("AN - Google tag (GA4)");

  it("the Google tag sends server_container_url from the server address and stops sending its own page_view", () => {
    const settings = Object.fromEntries((google().parameter.find((p) => p.key === "configSettingsTable")?.list ?? []).map((row) => [row.map[0].value, row.map[1].value]));

    assert.deepEqual(settings, { server_container_url: "{{AN - Server URL (omit when none)}}", send_page_view: "false" });
  });

  it("the helper returns the address only when it is an https one, and nothing (undefined) otherwise, so NONE means straight to Google", () => {
    const helper = version.variable.find((variable) => variable.name === "AN - Server URL (omit when none)");
    const code = String(helper?.parameter[0].value).replace("{{AN - Server URL}}", "SERVER");
    const run = (value: unknown) => new Function(`var SERVER = arguments[0]; return (${code.replace("var url = SERVER", "var url = SERVER")})();`)(value);

    assert.equal(run("NONE"), undefined);
    assert.equal(run(""), undefined);
    assert.equal(run(undefined), undefined);
    assert.equal(run("http://insecure.example"), undefined);
    assert.equal(run("https://metrics.example.test"), "https://metrics.example.test");
  });

  it("has a GA4 tag for page_view, one for search and one for the nine ecommerce events, and each sends the event's event_id", () => {
    const ga4 = version.tag.filter((tag) => tag.type === "gaawe");
    assert.deepEqual(ga4.map((tag) => tag.name), ["AN - GA4 - page_view", "AN - GA4 - search", "AN - GA4 - ecommerce events"]);

    for (const tag of ga4) assert.equal(rows(tag).event_id, "{{AN - DLV event_id}}", tag.name);
    assert.deepEqual(ga4[0].firingTriggerId.map(eventOf), ["page_view"]);
    assert.deepEqual(ga4[1].firingTriggerId.map(eventOf), ["search"]);
    assert.deepEqual(ga4[2].firingTriggerId.map(eventOf), [...GA4_ECOMMERCE_EVENTS]);
  });

  it("sends the page's address, title and referrer with page_view, and the search term with search", () => {
    assert.deepEqual(rows(tagNamed("AN - GA4 - page_view")), {
      event_id: "{{AN - DLV event_id}}",
      page_location: "{{AN - DLV page_location}}",
      page_title: "{{AN - DLV page_title}}",
      page_referrer: "{{AN - DLV page_referrer}}",
    });
    assert.equal(rows(tagNamed("AN - GA4 - search")).search_term, "{{AN - DLV search_term}}");
  });

  it("sends the hashed email, phone and external id with the ecommerce events when the shop pushed them, and the ecommerce object from the data layer", () => {
    const ecommerce = tagNamed("AN - GA4 - ecommerce events");

    assert.equal(rows(ecommerce).sha256_email_address, "{{AN - DLV user_data.sha256_email_address}}");
    assert.equal(rows(ecommerce).sha256_phone_number, "{{AN - DLV user_data.sha256_phone_number}}");
    assert.equal(rows(ecommerce).external_id, "{{AN - DLV user_data.external_id}}");
    assert.equal(ecommerce.parameter.find((p) => p.key === "sendEcommerceData")?.value, "true");
    assert.equal(ecommerce.parameter.find((p) => p.key === "eventName")?.value, "{{Event}}");
    assert.equal(ecommerce.parameter.find((p) => p.key === "getEcommerceDataFrom")?.value, "dataLayer");
  });

  it("does not put the search term on any other event (the data layer would carry it forward)", () => {
    for (const name of ["AN - GA4 - page_view", "AN - GA4 - ecommerce events"]) assert.equal("search_term" in rows(tagNamed(name)), false, name);
  });
});

describe("every Meta Pixel browser tag sends the event's id as eventID", () => {
  const meta = () => version.tag.filter((tag) => tag.name.startsWith("AN - Meta Pixel"));

  it("has the six standard events (PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase), each with eventID = {{AN - DLV event_id}}", () => {
    const track = (event: string) => meta().filter((tag) => html(tag).includes(`fbq('track', '${event}'`));

    for (const event of ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Purchase"]) {
      assert.ok(track(event).length > 0, event);
      for (const tag of track(event)) assert.match(html(tag), /\{ eventID: \{\{AN - DLV event_id\}\} \}/, tag.name);
    }
  });

  it("fires each on the right event, and none on remove_from_cart, view_cart, a plain product list, search or add_shipping_info", () => {
    const fires = (name: string) => tagNamed(name).firingTriggerId.map(eventOf);

    assert.deepEqual(fires("AN - Meta Pixel - init + PageView"), ["page_view"]);
    assert.deepEqual(fires("AN - Meta Pixel - ViewContent (product)"), ["view_item"]);
    assert.deepEqual(fires("AN - Meta Pixel - AddToCart"), ["add_to_cart"]);
    assert.deepEqual(fires("AN - Meta Pixel - InitiateCheckout"), ["begin_checkout"]);
    assert.deepEqual(fires("AN - Meta Pixel - AddPaymentInfo"), ["add_payment_info"]);
    assert.deepEqual(fires("AN - Meta Pixel - Purchase"), ["purchase"]);

    const used = new Set(meta().flatMap((tag) => tag.firingTriggerId.map(eventOf)));
    for (const never of ["remove_from_cart", "view_cart", "search", "add_shipping_info", "order_pending_payment"]) assert.ok(!used.has(never), never);
  });

  it("sends the SKUs as content_ids, content_type product, and the data layer's value and currency (BDT)", () => {
    const purchase = html(tagNamed("AN - Meta Pixel - Purchase"));

    assert.match(purchase, /content_ids: ids/);
    assert.match(purchase, /content_type: 'product'/);
    assert.match(purchase, /value: \{\{AN - DLV ecommerce\.value\}\}/);
    assert.match(purchase, /\{\{AN - DLV ecommerce\.currency\}\} \|\| 'BDT'/);
    assert.match(purchase, /var ids = items\.map\(function \(i\) \{ return i\.item_id; \}\)/, "the ids are the items' item_id, which is the SKU");
  });

  it("gives the purchase the hashed buyer details for Meta's matching, only when they exist", () => {
    const purchase = html(tagNamed("AN - Meta Pixel - Purchase"));

    for (const field of ["user.em = email", "user.ph = phone", "user.external_id = external"]) assert.ok(purchase.includes(field), field);
    assert.match(purchase, /if \(email \|\| phone \|\| external\) \{ fbq\('init'/);
  });

  it("starts the pixel once, on the first page_view or after the visitor allows marketing, and installs it only if it is not there", () => {
    assert.match(html(tagNamed("AN - Meta Pixel - init + PageView")), /if \(!window\._anMetaInit\)/);
    assert.deepEqual(tagNamed("AN - Meta Pixel - init after consent").firingTriggerId.map(eventOf), ["anaiza_consent_changed"]);
  });
});

describe("consent is unchanged", () => {
  it("every Meta tag needs ad_storage, and the GA4 tags use Google's own handling", () => {
    for (const tag of version.tag) {
      if (tag.type === "html") {
        assert.deepEqual(tag.consentSettings, { consentStatus: "NEEDED", consentType: { type: "LIST", list: [{ type: "TEMPLATE", value: "ad_storage" }] } }, tag.name);
      } else {
        assert.deepEqual(tag.consentSettings, { consentStatus: "NOT_SET" }, tag.name);
      }
    }
  });
});

describe("version 1 is left as it was", () => {
  it("still has its own file with the TikTok tags, for the record of what was first published", () => {
    const v1 = JSON.parse(readFileSync(new URL("../../docs/gtm-container-anaizanest.json", import.meta.url), "utf8"));

    assert.equal(v1.containerVersion.tag.length, 18);
    assert.ok(JSON.stringify(v1).includes("TikTok"));
  });
});
