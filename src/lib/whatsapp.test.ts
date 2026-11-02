import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_WHATSAPP_MESSAGE, isPathHidden, resolveWhatsApp, whatsappDigits, whatsappLink } from "./whatsapp.ts";

describe("wa.me links", () => {
  it("keeps digits only, with the country code", () => {
    assert.equal(whatsappDigits("+880 1886-004421"), "8801886004421");
    assert.equal(whatsappDigits("01886004421"), "8801886004421");
    assert.equal(whatsappDigits("008801886004421"), "8801886004421");
    assert.equal(whatsappDigits("abc"), null);
    assert.equal(whatsappDigits(""), null);
    assert.equal(whatsappDigits(null), null);
  });

  it("builds a link with the message URL-encoded", () => {
    assert.equal(whatsappLink("+8801886004421"), "https://wa.me/8801886004421");
    assert.equal(whatsappLink("+8801886004421", "   "), "https://wa.me/8801886004421");
    assert.equal(
      whatsappLink("+8801886004421", "Hello, #42: https://x.test/a?b=1&c=2"),
      "https://wa.me/8801886004421?text=Hello%2C%20%2342%3A%20https%3A%2F%2Fx.test%2Fa%3Fb%3D1%26c%3D2",
    );
    assert.equal(whatsappLink(null, "Hello"), null);
  });
});

describe("pages where the bubble is hidden", () => {
  it("matches the path and anything under it, not look-alikes", () => {
    const hidden = ["/checkout", "cart/"];

    assert.equal(isPathHidden("/checkout", hidden), true);
    assert.equal(isPathHidden("/checkout/", hidden), true);
    assert.equal(isPathHidden("/cart", hidden), true);
    assert.equal(isPathHidden("/cart/anything", hidden), true);
    assert.equal(isPathHidden("/checkout-guide", hidden), false);
    assert.equal(isPathHidden("/shop", hidden), false);
    assert.equal(isPathHidden("/CHECKOUT", hidden), true);
  });

  it("treats / as the home page only", () => {
    assert.equal(isPathHidden("/", ["/"]), true);
    assert.equal(isPathHidden("/shop", ["/"]), false);
  });

  it("hides nothing when nothing is listed", () => {
    assert.equal(isPathHidden("/checkout", []), false);
    assert.equal(isPathHidden("/checkout", null), false);
  });
});

describe("the settings the bubble and links read", () => {
  it("uses the WhatsApp number, else the contact phone, else nothing", () => {
    assert.equal(resolveWhatsApp({ contact_phone: "+8801700000000", whatsapp: { number: "+8801886004421" } }).number, "+8801886004421");
    assert.equal(resolveWhatsApp({ contact_phone: "+8801700000000", whatsapp: { number: null } }).number, "+8801700000000");
    assert.equal(resolveWhatsApp({ contact_phone: "+8801700000000" }).number, "+8801700000000");
    assert.equal(resolveWhatsApp({ contact_phone: null }).number, null);
    assert.equal(resolveWhatsApp(null).number, null);
  });

  it("falls back to the default message and keeps the bubble on for an older API", () => {
    const config = resolveWhatsApp({ contact_phone: "+8801700000000" });

    assert.equal(config.message, DEFAULT_WHATSAPP_MESSAGE);
    assert.equal(config.showBubble, true);
    assert.deepEqual(config.hiddenPaths, []);
  });

  it("follows the admin's switch, message and hidden pages", () => {
    const config = resolveWhatsApp({
      contact_phone: null,
      whatsapp: { number: "+8801886004421", message: " Hello there. ", show_bubble: false, hidden_paths: ["/checkout"] },
    });

    assert.equal(config.showBubble, false);
    assert.equal(config.message, "Hello there.");
    assert.deepEqual(config.hiddenPaths, ["/checkout"]);
  });
});

describe("the shop's order-confirm sentence", () => {
  const confirm = "Hello Rafi, this is Anaiza Nest. We have your order #42 (৳1,580). May we confirm the order Sir";

  it("goes through a link whole, decodes to the same text and ends with the owner's words", () => {
    const link = whatsappLink("01886004421", confirm);
    const text = decodeURIComponent(new URL(link as string).searchParams.get("text") ?? "");

    assert.equal(text, confirm);
    assert.ok(text.endsWith("May we confirm the order Sir"));
    assert.ok(!text.includes("May we confirm the address and a good time for delivery"));
  });

  it("is not written anywhere in the storefront: the confirm message is the shop's own, sent from the API", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name) && !name.endsWith("whatsapp.test.ts") && readFileSync(full, "utf8").includes("confirm the address and a good time for delivery")) found.push(full);
      }
    };
    const { fileURLToPath } = await import("node:url");
    walk(fileURLToPath(new URL("..", import.meta.url)));

    assert.deepEqual(found, []);
  });
});
