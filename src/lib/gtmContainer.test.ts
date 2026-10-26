import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { buildContainer, buildParts, GA4_EVENTS, GA4_MEASUREMENT_ID, manualBuildMarkdown, META_PIXEL_ID, NO_SERVER, SITE_EVENTS, TIKTOK_PLACEHOLDER, WEB_CONTAINER_ID, type ExportFile } from "./gtmContainer.ts";
import { validateExport } from "./gtmValidate.ts";

// The real export of the container (Tajin's), when it is in the repo: the header of every file is copied from it.
const referencePath = new URL("../../docs/gtm-export-empty.json", import.meta.url);
const reference: ExportFile | null = existsSync(referencePath) ? (JSON.parse(readFileSync(referencePath, "utf8")) as ExportFile) : null;
const container = buildContainer(reference).containerVersion;
const committed = JSON.parse(readFileSync(new URL("../../docs/gtm-container-anaizanest.json", import.meta.url), "utf8"));

type Tag = (typeof container.tag)[number];

const BUILT_IN_TRIGGERS = ["2147479553", "2147479573"];
const BUILT_IN_NAMES = new Set(["Event", "_event", "Page URL", "Page Hostname", "Page Path", "Referrer"]);
const tagText = (tag: Tag) => JSON.stringify(tag);
const html = (tag: Tag) => (tag.parameter.find((p) => p.key === "html")?.value as string | undefined) ?? "";

describe("the GTM container file", () => {
  it("is exactly what the code builds (run: node --no-warnings scripts/build-gtm-container.ts)", () => {
    assert.deepEqual(committed, JSON.parse(JSON.stringify(buildContainer(reference))));
  });

  it("is a web container for the shop's container id, in the export format GTM imports", () => {
    assert.equal(buildContainer(reference).exportFormatVersion, 2);
    assert.equal(container.container.publicId, WEB_CONTAINER_ID);
    assert.deepEqual(container.container.usageContext, ["WEB"]);
  });

  it("prefixes every tag, trigger and variable with 'AN - '", () => {
    for (const item of [...container.tag, ...container.trigger, ...container.variable]) assert.ok(item.name.startsWith("AN - "), item.name);
  });

  it("has unique ids and names within each kind", () => {
    for (const [kind, key] of [["tag", "tagId"], ["trigger", "triggerId"], ["variable", "variableId"]] as const) {
      const list = container[kind] as Record<string, string>[];
      assert.equal(new Set(list.map((item) => item[key])).size, list.length, `${kind} ids`);
      assert.equal(new Set(list.map((item) => item.name)).size, list.length, `${kind} names`);
    }
  });
});

describe("the constants", () => {
  const constants = Object.fromEntries(container.variable.filter((v) => v.type === "c").map((v) => [v.name, v.parameter[0].value]));

  it("hold the GA4 and Meta ids, a placeholder for TikTok, and NONE (GTM keeps no empty constant) for the server address", () => {
    assert.equal(constants["AN - GA4 Measurement ID"], GA4_MEASUREMENT_ID);
    assert.equal(constants["AN - Meta Pixel ID"], META_PIXEL_ID);
    assert.equal(constants["AN - TikTok Pixel ID"], TIKTOK_PLACEHOLDER);
    assert.equal(constants["AN - Server URL"], NO_SERVER);
    assert.ok(Object.values(constants).every((value) => String(value) !== ""), "no constant is empty");
  });

  it("sends the GA4 stream through the server address only when it is an https address", () => {
    const googleTag = container.tag.find((tag) => tag.type === "googtag");
    const rows = (googleTag?.parameter.find((p) => p.key === "configSettingsTable")?.list ?? []) as { map: { key: string; value: string }[] }[];

    assert.deepEqual(rows.map((row) => row.map.map((cell) => cell.value)), [["server_container_url", "{{AN - Server URL (omit when none)}}"]]);
    const helper = container.variable.find((v) => v.name === "AN - Server URL (omit when none)");
    assert.match(String(helper?.parameter[0].value), /\{\{AN - Server URL\}\}/);
    assert.match(String(helper?.parameter[0].value), /undefined/);
  });

  it("carries no secret of any kind", () => {
    const text = JSON.stringify(buildContainer(reference));

    for (const word of ["access_token", "Access-Token", "EAA", "secret", "password", "api_key", "test_event_code", "TEST1"]) {
      assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `no "${word}"`);
    }
  });
});

describe("references", () => {
  const variableNames = new Set([...container.variable.map((v) => v.name), ...BUILT_IN_NAMES]);
  const triggerIds = new Set([...container.trigger.map((t) => t.triggerId), ...BUILT_IN_TRIGGERS]);

  it("every {{name}} used anywhere is a variable of the container or a built-in one", () => {
    const text = JSON.stringify(buildContainer(reference));

    for (const match of text.matchAll(/\{\{([^}]+)\}\}/g)) assert.ok(variableNames.has(match[1]), `${match[1]} exists`);
  });

  it("every tag fires on triggers that exist, and every trigger is used or is one of the site's events", () => {
    for (const tag of container.tag) {
      assert.ok(tag.firingTriggerId.length > 0, `${tag.name} has a trigger`);
      for (const id of tag.firingTriggerId) assert.ok(triggerIds.has(id), `${tag.name}: trigger ${id}`);
    }
  });
});

describe("the events", () => {
  const pushedBySite = (() => {
    const source = readFileSync(new URL("./tracking.ts", import.meta.url), "utf8") + readFileSync(new URL("./consentBootstrap.ts", import.meta.url), "utf8");

    return [...new Set([...source.matchAll(/event:\s*"([a-z_]+)"/g)].map((match) => match[1]).filter((name) => name !== "gtm.js"))].sort();
  })();

  it("has a trigger for every event the site pushes, and the site pushes nothing the container does not know", () => {
    assert.deepEqual([...SITE_EVENTS].sort(), pushedBySite);

    const triggerEvents = container.trigger.map((trigger) => trigger.customEventFilter[0].parameter[1].value);
    for (const event of SITE_EVENTS) assert.ok(triggerEvents.includes(event), event);
  });

  it("sends each GA4 event under its own name from one tag, with the ecommerce object from the data layer", () => {
    const ga4 = container.tag.filter((tag) => tag.type === "gaawe");

    assert.equal(ga4.length, 1);
    assert.equal(ga4[0].parameter.find((p) => p.key === "eventName")?.value, "{{Event}}");
    assert.equal(ga4[0].parameter.find((p) => p.key === "sendEcommerceData")?.value, "true");
    assert.equal(ga4[0].parameter.find((p) => p.key === "getEcommerceDataFrom")?.value, "dataLayer");
    assert.equal(ga4[0].parameter.find((p) => p.key === "measurementIdOverride")?.value, "{{AN - GA4 Measurement ID}}");

    const fires = ga4[0].firingTriggerId.map((id) => container.trigger.find((trigger) => trigger.triggerId === id)?.customEventFilter[0].parameter[1].value);
    assert.deepEqual(fires, [...GA4_EVENTS]);
  });

  it("starts the Google tag first, on Initialization, once per page", () => {
    const googleTag = container.tag.find((tag) => tag.type === "googtag");

    assert.deepEqual(googleTag?.firingTriggerId, ["2147479573"]);
    assert.equal(googleTag?.tagFiringOption, "ONCE_PER_LOAD");
  });

  const platforms: [string, string[]][] = [
    ["Meta Pixel", ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Purchase"]],
    ["TikTok Pixel", ["ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "CompletePayment"]],
  ];

  for (const [platform, standardEvents] of platforms) {
    it(`${platform}: has a tag for each standard event, and every one needs ad_storage before it fires`, () => {
      const tags = container.tag.filter((tag) => tag.name.startsWith(`AN - ${platform}`));
      const code = tags.map(html).join("\n");

      for (const event of standardEvents) assert.ok(code.includes(`'${event}'`) || code.includes(`"${event}"`) || (platform === "TikTok Pixel" && event === "PageView"), event);
      for (const tag of tags) {
        assert.equal(tag.consentSettings.consentStatus, "NEEDED", tag.name);
        assert.deepEqual(JSON.stringify(tag.consentSettings), JSON.stringify({ consentStatus: "NEEDED", consentType: { type: "LIST", list: [{ type: "TEMPLATE", value: "ad_storage" }] } }));
      }
    });
  }

  it("lets the base tags start again when the visitor allows marketing, once per page", () => {
    const consentTrigger = container.trigger.find((trigger) => trigger.customEventFilter[0].parameter[1].value === "anaiza_consent_changed")?.triggerId;

    for (const name of ["AN - Meta Pixel - base + PageView", "AN - TikTok Pixel - base + page"]) {
      const tag = container.tag.find((item) => item.name === name);
      assert.deepEqual(tag?.firingTriggerId, ["2147479553", consentTrigger]);
      assert.equal(tag?.tagFiringOption, "ONCE_PER_LOAD");
    }
  });

  it("gives the browser purchase the id the server uses (order-<number>): Meta's eventID and TikTok's event_id", () => {
    const meta = html(container.tag.find((tag) => tag.name === "AN - Meta Pixel - Purchase") as Tag);
    const tiktok = html(container.tag.find((tag) => tag.name === "AN - TikTok Pixel - CompletePayment (purchase)") as Tag);

    assert.match(meta, /\{ eventID: \{\{AN - DLV event_id\}\} \}/);
    assert.match(tiktok, /\{ event_id: \{\{AN - DLV event_id\}\} \}/);
    assert.match(meta, /fbq\('track', 'Purchase'/);
    assert.match(tiktok, /ttq\.track\('CompletePayment'/);
  });

  it("fires the purchase tags only on the purchase event (a wallet order's pending event sends no sale)", () => {
    const purchaseTrigger = container.trigger.find((trigger) => trigger.customEventFilter[0].parameter[1].value === "purchase")?.triggerId;

    for (const name of ["AN - Meta Pixel - Purchase", "AN - TikTok Pixel - CompletePayment (purchase)"]) {
      assert.deepEqual(container.tag.find((tag) => tag.name === name)?.firingTriggerId, [purchaseTrigger]);
    }
    assert.ok(!container.tag.some((tag) => tagText(tag).includes("order_pending_payment")));
  });

  it("keeps the product-list ViewContent to landing pages, like the site's own pixel calls", () => {
    const landing = container.trigger.find((trigger) => trigger.name === "AN - CE view_item_list (landing page)");

    assert.equal(landing?.filter?.[0].type, "STARTS_WITH");
    assert.equal(landing?.filter?.[0].parameter[1].value, "Landing page:");
    for (const tag of container.tag.filter((item) => item.name.includes("ViewContent (landing page)"))) assert.deepEqual(tag.firingTriggerId, [landing?.triggerId]);
  });

  it("builds the content ids from the same items the data layer carries (SKU as item_id)", () => {
    const view = html(container.tag.find((tag) => tag.name === "AN - Meta Pixel - ViewContent (product)") as Tag);

    assert.match(view, /content_ids: \[i\.item_id\]/);
    assert.match(view, /currency: \{\{AN - DLV ecommerce\.currency\}\} \|\| 'BDT'/);
  });

  it("has Google's own consent handling on its tags and never double-loads the site's own pixels", () => {
    for (const tag of container.tag.filter((item) => item.type !== "html")) assert.equal(tag.consentSettings.consentStatus, "NOT_SET", tag.name);
    assert.ok(!container.tag.some((tag) => /googletagmanager\.com\/gtag/.test(html(tag))), "no second gtag install");
  });
});

describe("the files in parts", () => {
  const parts = buildParts(reference);
  const committedPart = (file: string) => JSON.parse(readFileSync(new URL(`../../docs/gtm/${file}`, import.meta.url), "utf8"));

  it("are the committed files, in the order to import them", () => {
    assert.deepEqual(parts.map((part) => part.file), ["01-variables.json", "02-triggers.json", "03-tags-ga4.json", "04-tags-meta.json", "05-tags-tiktok.json", "04-tags-meta.no-consent.json", "05-tags-tiktok.no-consent.json"]);
    for (const part of parts) assert.deepEqual(committedPart(part.file), JSON.parse(JSON.stringify(part.content)), part.file);
    assert.deepEqual(readdirSync(new URL("../../docs/gtm/", import.meta.url)).sort(), parts.map((part) => part.file).sort());
  });

  it("together hold exactly the full container's variables, triggers and tags", () => {
    const names = (kind: "tag" | "trigger" | "variable", files: string[]) => [...new Set(parts.filter((part) => files.includes(part.file)).flatMap((part) => (part.content.containerVersion[kind] as { name: string }[]).map((item) => item.name)))].sort();

    assert.deepEqual(names("variable", ["01-variables.json"]), container.variable.map((item) => item.name).sort());
    assert.deepEqual(names("trigger", ["02-triggers.json"]), container.trigger.map((item) => item.name).sort());
    assert.deepEqual(names("tag", ["03-tags-ga4.json", "04-tags-meta.json", "05-tags-tiktok.json"]), container.tag.map((item) => item.name).sort());
  });

  it("each carry only their own kind (plus the triggers their tags fire on), so a failing part points at one thing", () => {
    for (const part of parts) {
      const version = part.content.containerVersion as Record<string, unknown[]>;
      const own = { "01-variables.json": "variable", "02-triggers.json": "trigger" }[part.file as string];

      if (own === "variable") assert.deepEqual([version.tag.length, version.trigger.length], [0, 0]);
      else if (own === "trigger") assert.deepEqual([version.tag.length, version.variable.length], [0, 0]);
      else assert.equal(version.variable.length, 0, part.file);
    }
  });
});

describe("the validator", () => {
  const external = container.variable.map((variable) => variable.name);

  it("finds nothing wrong with any of the files (npm run gtm:validate)", () => {
    const errors = (file: unknown, extra = {}) => validateExport(file, { reference: reference as never, externalVariables: external, ...extra }).filter((finding) => finding.level === "error");

    assert.deepEqual(errors(committed), []);
    for (const part of buildParts(reference)) assert.deepEqual(errors(JSON.parse(JSON.stringify(part.content))), [], part.file);
  });

  it("accepts the real export itself, so its rules are the ones GTM writes by", { skip: reference === null }, () => {
    assert.deepEqual(validateExport(reference, { allowForeignTypes: true }), []);
  });

  it("catches the faults GTM's importer refuses", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a test that breaks a copy of the file in ways its type forbids
    const broken = (change: (version: Record<string, any>) => void) => {
      const copy = JSON.parse(JSON.stringify(committed));
      change(copy.containerVersion);

      return validateExport(copy, { reference: reference as never }).filter((finding) => finding.level === "error").map((finding) => finding.message);
    };

    assert.ok(broken((v) => (v.tag[0].mystery = "x")).some((m) => m.includes("stray field")));
    assert.ok(broken((v) => (v.tag[0].type = "html5")).some((m) => m.includes("is not one of googtag")));
    assert.ok(broken((v) => (v.tag[0].tagId = v.tag[1].tagId)).some((m) => m.includes("used twice")));
    assert.ok(broken((v) => (v.tag[0].firingTriggerId = ["777"])).some((m) => m.includes("not in the file")));
    assert.ok(broken((v) => (v.tag[0].parameter[0].value = "{{No such variable}}")).some((m) => m.includes("not a variable")));
    assert.ok(broken((v) => (v.variable[0].parameter[0].type = "STRING")).some((m) => m.includes("parameter type")));
    assert.ok(broken((v) => (v.variable[0].variableId = 12)).some((m) => m.includes("string of digits")));
    assert.ok(broken((v) => (v.trigger[0].type = "CLICKY")).some((m) => m.includes("trigger type")));
    assert.ok(broken((v) => (v.tag[3].consentSettings = { consentStatus: "NEEDED" })).some((m) => m.includes("consentType")));
    assert.ok(broken((v) => (v.variable.find((x: { type: string }) => x.type === "jsm").parameter[0].value = "function () { return () => 1; }")).some((m) => m.includes("ES5")));
    assert.ok(broken((v) => delete v.tag[0].monitoringMetadata).some((m) => m.includes("missing field")));
    assert.ok(broken((v) => (v.accountId = "1")).some((m) => m.includes("differ")));
  });

  it("uses ids that cannot clash with the ones already in the container (the real export's go up to 43)", () => {
    for (const item of [...container.tag, ...container.trigger, ...container.variable] as Record<string, string>[]) {
      assert.ok(Number(item.tagId ?? item.triggerId ?? item.variableId) >= 9000);
    }
  });
});

describe("the build-by-hand document", () => {
  const manual = manualBuildMarkdown();

  it("names every variable, trigger and tag of the container, with the code of every tag", () => {
    for (const item of [...container.variable, ...container.trigger, ...container.tag]) assert.ok(manual.includes(`\`${item.name}\``), item.name);
    for (const tag of container.tag.filter((item) => item.type === "html")) assert.ok(manual.includes(html(tag as Tag)), tag.name);
  });

  it("is the committed file", () => {
    assert.equal(readFileSync(new URL("../../docs/gtm-manual-build.md", import.meta.url), "utf8"), `${manual}\n`);
  });
});
