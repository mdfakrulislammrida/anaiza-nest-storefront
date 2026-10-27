import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { contactMethod } from "./contactLinks.ts";
import { EXTERNAL_ID_COOKIE, EXTERNAL_ID_MAX_AGE_SECONDS, externalIdHash, externalIdSource, forgetExternalId, keepFbcFromClick, orderMatchData, readFbc, readFbp } from "./identity.ts";
import { announceIdentity, pushesSettled, trackPageView, trackViewItem } from "./tracking.ts";
import type { Product } from "./types.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const win = globalThis as unknown as { window?: Record<string, unknown>; document?: unknown };
const settle = async () => {
  await pushesSettled();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await pushesSettled();
};
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let jar: Map<string, string>;
let lines: string[];
let marketing = true;

/** A page with a working cookie jar that also remembers every cookie line written, and the visitor's consent. */
function setUp({ consent = true, https = true, customerId = null as number | null } = {}) {
  marketing = consent;
  jar = new Map();
  lines = [];
  win.document = {
    title: "",
    get cookie() {
      return [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(line: string) {
      lines.push(line);
      const [pair] = line.split(";");
      const [key, ...value] = pair.split("=");
      if (/Max-Age=0/i.test(line)) jar.delete(key.trim());
      else jar.set(key.trim(), value.join("="));
    },
  };
  win.window = {
    dataLayer: [],
    location: { href: "https://anaizanest.com/", pathname: "/", protocol: https ? "https:" : "http:" },
    anaizaConsent: { config: { meta: null, gtm: "GTM-TEST" }, effective: () => ({ a: marketing, m: marketing }) },
    ...(customerId !== null
      ? { localStorage: { getItem: () => JSON.stringify({ customer: { id: customerId, name: "N", email: "n@example.test", phone: "01712345678" }, token: "t" }) } }
      : {}),
  };
}

const layer = () => (win.window?.dataLayer as Record<string, unknown>[]).filter((entry) => entry.event);
const externalIds = () => layer().map((entry) => (entry.user_data as { external_id?: string } | undefined)?.external_id);

beforeEach(() => setUp());
afterEach(() => {
  delete win.document;
});

describe("the visitor's id (the cookie an_eid)", () => {
  it("is not made before the visitor allows marketing, and nothing is read or written", async () => {
    setUp({ consent: false });

    assert.equal(externalIdSource(), null);
    assert.equal(await externalIdHash(), null);
    assert.deepEqual(lines, []);
    assert.equal(jar.size, 0);
  });

  it("is made once marketing is allowed: a random UUID that lasts 400 days, for this site, Lax, and Secure on https", () => {
    const id = externalIdSource() as string;

    assert.match(id, UUID_V4);
    assert.equal(jar.get(EXTERNAL_ID_COOKIE), id);
    assert.equal(lines.length, 1);
    assert.match(lines[0], new RegExp(`^an_eid=${id}; Max-Age=${EXTERNAL_ID_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; Secure$`));
    assert.equal(EXTERNAL_ID_MAX_AGE_SECONDS, 400 * 24 * 60 * 60);
  });

  it("is not marked Secure on a plain http page (a browser would refuse it)", () => {
    setUp({ https: false });
    externalIdSource();

    assert.doesNotMatch(lines[0], /Secure/);
  });

  it("is the same on every page and every event of the visit, and is written only once", async () => {
    const first = externalIdSource();
    trackPageView("", true);
    trackPageView("/", false);
    await settle();

    assert.equal(externalIdSource(), first);
    assert.equal(lines.length, 1, "set only when it is not there yet");
    const ids = externalIds();
    assert.equal(ids.length, 2);
    assert.ok(ids.every((id) => id === sha(first as string)));
  });

  it("is the customer id when signed in, and the cookie id again after signing out; the guest id is kept for that purchase", () => {
    const guest = externalIdSource() as string;

    setUp({ customerId: 31 });
    // a new page object: the signed-in customer wins over a cookie that is still there
    jar.set(EXTERNAL_ID_COOKIE, guest);
    assert.equal(externalIdSource(), "31");
    assert.equal(jar.get(EXTERNAL_ID_COOKIE), guest, "the guest id is not touched");

    delete (win.window as Record<string, unknown>).localStorage;
    assert.equal(externalIdSource(), guest);
  });

  it("is never made from a phone number or an email address", async () => {
    const source = externalIdSource() as string;

    assert.match(source, UUID_V4);
    for (const raw of ["8801712345678", "01712345678", "nusrat.jahan@gmail.com"]) {
      assert.notEqual(source, raw);
      assert.notEqual(await externalIdHash(), sha(raw));
    }
  });

  it("is SHA-256 as 64 lower-case hex characters, of the id text", async () => {
    const source = externalIdSource() as string;
    const hash = (await externalIdHash()) as string;

    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash, sha(source));
  });

  it("is forgotten when marketing is refused again", () => {
    externalIdSource();
    assert.equal(jar.size, 1);

    forgetExternalId();

    assert.equal(jar.size, 0);
  });

  it("is not kept when the browser will not keep cookies: no cookie, no id", () => {
    (win.document as { cookie: string }) = Object.defineProperty({ title: "" }, "cookie", { get: () => "", set: () => undefined }) as never;

    assert.equal(externalIdSource(), null);
  });
});

describe("on every event", () => {
  const product = { id: 7, name: "Mug", sku: "M-1", slug: "mug", effective_price: 600, price: 600, category: { name: "Mugs" }, variants: [] } as unknown as Product;

  it("user_data.external_id is the hash of the id, on each event, once marketing is allowed", async () => {
    trackPageView("", true);
    trackViewItem(product);
    announceIdentity();
    await settle();

    const id = jar.get(EXTERNAL_ID_COOKIE) as string;
    assert.deepEqual(layer().map((entry) => entry.event), ["page_view", "view_item", "anaiza_identity_changed"]);
    assert.deepEqual(externalIds(), [sha(id), sha(id), sha(id)]);
  });

  it("is absent without marketing consent: no user_data at all, and no cookie", async () => {
    setUp({ consent: false });

    trackPageView("", true);
    trackViewItem(product);
    await settle();

    assert.equal(layer().length, 2);
    for (const entry of layer()) assert.equal("user_data" in entry, false);
    assert.equal(jar.size, 0);
  });

  it("the raw id is never in the data layer, only its hash", async () => {
    trackPageView("", true);
    trackViewItem(product);
    await settle();

    const id = jar.get(EXTERNAL_ID_COOKIE) as string;
    assert.ok(!JSON.stringify(win.window?.dataLayer).includes(id));
  });

  it("switches to the customer id when the visitor signs in", async () => {
    trackViewItem(product);
    await settle();
    const guest = jar.get(EXTERNAL_ID_COOKIE) as string;

    (win.window as Record<string, unknown>).localStorage = {
      getItem: () => JSON.stringify({ customer: { id: 31, name: "N", email: "n@example.test", phone: "01712345678" }, token: "t" }),
    };
    announceIdentity();
    trackViewItem(product);
    await settle();

    assert.deepEqual(externalIds(), [sha(guest), sha("31"), sha("31")]);
  });

  it("keeps the order of events even while the first id is being hashed", async () => {
    trackPageView("", true);
    trackViewItem(product);
    trackViewItem(product);
    await settle();

    assert.deepEqual(layer().map((entry) => entry.event), ["page_view", "view_item", "view_item"]);
  });
});

describe("fbp, fbc and what an order carries", () => {
  const FBP = "fb.1.1700000000000.1234567890";
  const FBC = "fb.1.1700000000000.IwAR0abc-DEF_123";

  it("reads Meta's cookies only when they have the shape the shop's server accepts", () => {
    jar.set("_fbp", FBP);
    jar.set("_fbc", FBC);
    assert.equal(readFbp(), FBP);
    assert.equal(readFbc(), FBC);

    jar.set("_fbp", "not a cookie");
    jar.set("_fbc", "fb.1.x.y");
    assert.equal(readFbp(), null);
    assert.equal(readFbc(), null);
  });

  it("keeps the ad click as fb.1.<ms>.<fbclid> when Meta's own cookie is missing, and prefers Meta's cookie when it is there", () => {
    keepFbcFromClick("IwAR0click", 1700000000123);

    assert.equal(jar.get("an_fbc"), "fb.1.1700000000123.IwAR0click");
    assert.match(lines[0], /^an_fbc=.*; Max-Age=7776000; Path=\/; SameSite=Lax; Secure$/);
    assert.equal(readFbc(), "fb.1.1700000000123.IwAR0click");

    jar.set("_fbc", FBC);
    assert.equal(readFbc(), FBC);
  });

  it("does not overwrite or add a copy when Meta's cookie is there, and ignores a click id with odd characters", () => {
    jar.set("_fbc", FBC);
    keepFbcFromClick("IwAR0click");
    assert.equal(jar.has("an_fbc"), false);

    jar.delete("_fbc");
    keepFbcFromClick("bad id;drop");
    assert.equal(jar.has("an_fbc"), false);
  });

  it("the order carries fbp, fbc and external_id with consent, and a missing piece is simply left out", async () => {
    jar.set("_fbp", FBP);
    jar.set("_fbc", FBC);
    const all = await orderMatchData();
    const id = jar.get(EXTERNAL_ID_COOKIE) as string;

    assert.deepEqual(all, { fbp: FBP, fbc: FBC, external_id: sha(id) });

    jar.delete("_fbp");
    jar.delete("_fbc");
    assert.deepEqual(await orderMatchData(), { external_id: sha(id) });
  });

  it("the order carries none of the three without marketing consent", async () => {
    setUp({ consent: false });
    jar.set("_fbp", FBP);
    jar.set("_fbc", FBC);

    assert.deepEqual(await orderMatchData(), {});
  });
});

describe("WhatsApp and phone links", () => {
  it("are told apart from every other link", () => {
    assert.equal(contactMethod("tel:+8801712345678"), "phone");
    assert.equal(contactMethod("TEL:01712345678"), "phone");
    assert.equal(contactMethod("https://wa.me/8801712345678?text=Hello"), "whatsapp");
    assert.equal(contactMethod("https://api.whatsapp.com/send?phone=8801712345678"), "whatsapp");
    assert.equal(contactMethod("whatsapp://send?phone=1"), "whatsapp");
    assert.equal(contactMethod("https://anaizanest.com/contact"), null);
    assert.equal(contactMethod("https://wa.me.evil.example/x"), null);
    assert.equal(contactMethod("mailto:a@example.test"), null);
    assert.equal(contactMethod(null), null);
  });
});
