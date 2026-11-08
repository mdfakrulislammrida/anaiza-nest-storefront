import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { pushesSettled, trackPageView, trackSearch } from "./tracking.ts";
import { isTrackableSearch, trackedUrl } from "./trackingPrivacy.ts";
import { buildContactHashes, pickBuyer } from "./userData.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const win = globalThis as unknown as { window?: Record<string, unknown>; document?: unknown };

describe("addresses pushed to the data layer", () => {
  it("strips the query and the hash from the password-reset page, so the token never leaves the shop", () => {
    assert.equal(trackedUrl("https://anaizanest.com/reset-password/?token=abc123&email=a%40b.com#x"), "https://anaizanest.com/reset-password/");
    assert.equal(trackedUrl("https://anaizanest.com/reset-password?token=abc123"), "https://anaizanest.com/reset-password");
    assert.equal(trackedUrl("/reset-password?token=abc123"), "/reset-password");
  });

  it("strips the recovery link and the order confirmation page", () => {
    assert.equal(trackedUrl("https://anaizanest.com/recover/AbCdEf?utm_source=email"), "https://anaizanest.com/recover/AbCdEf");
    assert.equal(trackedUrl("https://anaizanest.com/recover?t=1"), "https://anaizanest.com/recover");
    assert.equal(trackedUrl("https://anaizanest.com/order-confirmation/?utm_source=x#top"), "https://anaizanest.com/order-confirmation/");
  });

  it("strips any page whose query has a key like token, email, phone, key, code, reset or order (in any case)", () => {
    for (const key of ["token", "email", "phone", "key", "code", "reset", "order", "Reset_Token", "ORDER_ID", "coupon_code", "api_key"]) {
      assert.equal(trackedUrl(`https://anaizanest.com/shop?${key}=1&utm_source=a`), "https://anaizanest.com/shop", key);
    }
  });

  it("keeps every other address exactly as it is, so UTM tags and click ids still reach analytics", () => {
    const product = "https://anaizanest.com/product/rose-cup/?utm_source=facebook&utm_medium=cpc&utm_campaign=eid&fbclid=IwAR0abc&gclid=Cj0K";
    assert.equal(trackedUrl(product), product);
    assert.equal(trackedUrl("https://anaizanest.com/shop?search=tea%20set&page=2#results"), "https://anaizanest.com/shop?search=tea%20set&page=2#results");
    assert.equal(trackedUrl("https://www.google.com/"), "https://www.google.com/");
    assert.equal(trackedUrl("/product/rose-cup?utm_source=a"), "/product/rose-cup?utm_source=a");
  });

  it("says nothing for nothing, and does not fail on what is not an address", () => {
    assert.equal(trackedUrl(""), "");
    assert.equal(trackedUrl(null), "");
    assert.equal(trackedUrl(undefined), "");
    assert.equal(trackedUrl("not a url"), "not a url");
  });

  it("strips the referrer too when the visitor came from a sensitive page", () => {
    assert.equal(trackedUrl("https://anaizanest.com/reset-password?token=zzz"), "https://anaizanest.com/reset-password");
  });
});

describe("which search terms are tracked", () => {
  it("tracks an ordinary search", () => {
    for (const term of ["tea set", "rose cup", "gift box 3", "মগ", "set of 6 cups"]) assert.equal(isTrackableSearch(term), true, term);
  });

  it("skips what looks like an email address", () => {
    for (const term of ["priya@example.com", "me@", "@home"]) assert.equal(isTrackableSearch(term), false, term);
  });

  it("skips what looks like a phone number or another long number (8 or more digits once spaces and dashes are out)", () => {
    for (const term of ["01712345678", "+880 1712-345678", "017-1234 5678", "12345678", "1234 5678"]) assert.equal(isTrackableSearch(term), false, term);
    assert.equal(isTrackableSearch("1234567"), true, "seven digits is not a phone number");
  });

  it("skips an empty term", () => {
    assert.equal(isTrackableSearch("   "), false);
    assert.equal(isTrackableSearch(null), false);
  });
});

describe("the page view and the search event", () => {
  const layer = () => (win.window?.dataLayer as Record<string, unknown>[]).filter((entry) => entry.event);

  beforeEach(() => {
    win.window = {
      dataLayer: [],
      fbq: () => undefined,
      anaizaConsent: { config: { meta: "111222333" }, effective: () => ({ a: true, m: true }) },
      location: { href: "https://anaizanest.com/reset-password/?token=SECRET&email=a%40b.com", pathname: "/reset-password/" },
    };
    win.document = { title: "Choose a new password" };
  });

  afterEach(() => {
    delete win.window;
    delete win.document;
  });

  it("pushes the reset-password page without its token, and keeps the page path", async () => {
    trackPageView("https://anaizanest.com/recover/AbC?utm=1", false);
    await pushesSettled();

    const pushed = layer().find((entry) => entry.event === "page_view") as Record<string, string>;

    assert.equal(pushed.page_location, "https://anaizanest.com/reset-password/");
    assert.equal(pushed.page_referrer, "https://anaizanest.com/recover/AbC");
    assert.equal(pushed.page_path, "/reset-password/");
    assert.ok(!JSON.stringify(layer()).includes("SECRET"));
  });

  it("pushes a normal product page with its UTM tags", async () => {
    const href = "https://anaizanest.com/product/rose-cup/?utm_source=facebook&utm_campaign=eid&fbclid=IwAR0abc";
    (win.window as Record<string, unknown>).location = { href, pathname: "/product/rose-cup/" };

    trackPageView("https://www.google.com/", true);
    await pushesSettled();

    const pushed = layer().find((entry) => entry.event === "page_view") as Record<string, string>;

    assert.equal(pushed.page_location, href);
    assert.equal(pushed.page_referrer, "https://www.google.com/");
  });

  it("does not push a search that looks like an email or a phone number, and pushes an ordinary one", async () => {
    trackSearch("priya@example.com");
    trackSearch("01712345678");
    await pushesSettled();
    assert.equal(layer().filter((entry) => entry.event === "search").length, 0);

    trackSearch("tea set");
    await pushesSettled();
    const searches = layer().filter((entry) => entry.event === "search") as Record<string, string>[];
    assert.equal(searches.length, 1);
    assert.equal(searches[0].search_term, "tea set");
  });
});

describe("who is buying: the first valid of typed and saved", () => {
  it("an invalid saved phone does not hide a valid typed one", async () => {
    const buyer = pickBuyer({ email: "", phone: "01712345678" }, { email: "saved@example.com", phone: "12345" });

    assert.equal(buyer.phone, "01712345678");
    assert.equal(buyer.email, "saved@example.com");

    const hashes = await buildContactHashes(buyer);

    assert.equal(hashes?.sha256_phone_number, sha("8801712345678"));
    assert.equal(hashes?.sha256_email_address, sha("saved@example.com"));
  });

  it("an invalid saved email does not hide a valid typed one, and typed wins when both are valid", async () => {
    assert.equal(pickBuyer({ email: " Priya@Example.com ", phone: "" }, { email: "not-an-email", phone: "01811111111" }).email, " Priya@Example.com ");
    assert.equal(pickBuyer({ email: "typed@example.com", phone: "01712345678" }, { email: "saved@example.com", phone: "01811111111" }).phone, "01712345678");
    assert.equal(pickBuyer({ email: "typed@example.com", phone: "" }, { email: "saved@example.com", phone: "" }).email, "typed@example.com");
  });

  it("uses the saved value when nothing valid was typed, and passes an invalid one on to be dropped", async () => {
    assert.equal(pickBuyer({ email: "", phone: "0171" }, { email: "saved@example.com", phone: "01811111111" }).phone, "01811111111");

    const none = pickBuyer({ email: "oops", phone: "0171" }, { email: "", phone: "" });

    assert.equal(none.phone, "0171");
    assert.equal(await buildContactHashes(none), null, "nothing valid: nothing hashed");
    assert.deepEqual(pickBuyer(null, undefined), { email: "", phone: "" });
  });

  it("hashing and normalising are as they were: lower-case email, 8801XXXXXXXXX digits", async () => {
    const hashes = await buildContactHashes(pickBuyer({ email: "  Rafi@Example.COM ", phone: "+880 1712-345678" }, null));

    assert.equal(hashes?.sha256_email_address, sha("rafi@example.com"));
    assert.equal(hashes?.sha256_phone_number, sha("8801712345678"));
  });
});
