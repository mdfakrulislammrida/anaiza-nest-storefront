import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

// The rules that can be read straight from the source: where a shadow, a gradient, a seal, a pour line or a burgundy
// fill may be written. A page-level check needs a browser (scripts/signature-probe.cjs); this one runs in `npm test`
// and stops the next change from adding a second one without anyone deciding to.
const srcDir = fileURLToPath(new URL("..", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return walk(`${path}/`);
    return /\.(tsx|css)$/.test(entry.name) ? [path] : [];
  });
}

const files = walk(srcDir).map((path) => ({
  name: relative(srcDir, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

function filesWith(pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(file.text)).map((file) => file.name).sort();
}

describe("signature visuals in the source", () => {
  it("has no box-shadow written inline: the only shadow is the product one in globals.css", () => {
    assert.deepEqual(filesWith(/shadow-\[/), []);
    assert.deepEqual(filesWith(/box-shadow\s*:/).filter((name) => name !== "app/globals.css"), []);
  });

  it("uses the product shadow on product photography only", () => {
    assert.deepEqual(filesWith(/\bshadow-warm\b/).filter((name) => name !== "app/globals.css"), [
      "components/ProductCard.tsx",
      "components/ProductGallery.tsx",
      "components/landing/LandingBlocks.tsx",
    ]);
  });

  it("allows a gradient only as a marked text scrim, plus the read-more fade", () => {
    // Hero.tsx: the one 120 px fade at the edge of the hero's text panel when a picture is set (deepink at the panel's own
    // opacity to nothing; see docs/signature-checks.md).
    const scrimFiles = ["components/Hero.tsx", "components/HeroSlider.tsx", "components/landing/LandingBlocks.tsx"];
    assert.deepEqual(filesWith(/\bbg-gradient-/), scrimFiles);
    for (const name of scrimFiles) {
      const text = files.find((file) => file.name === name)?.text ?? "";
      const lines = text.split("\n").filter((line) => line.includes("bg-gradient-"));
      assert.ok(lines.length > 0 && lines.every((line) => line.includes("data-scrim")), `${name}: every gradient carries data-scrim`);
    }
    assert.deepEqual(filesWith(/linear-gradient\(/), ["app/prose.css"]);
  });

  it("draws the pour line in one place, and keeps the seal to its two", () => {
    assert.deepEqual(filesWith(/<PourLine\b/), ["components/Hero.tsx"]);
    assert.deepEqual(filesWith(/<Seal\b/), ["components/CheckoutForm.tsx", "components/ProductDetail.tsx"]);
  });

  it("puts a burgundy fill only on the order buttons, never on the landing page's blocks", () => {
    assert.deepEqual(filesWith(/\bbg-burgundy\b/), [
      "app/cart/page.tsx",
      "components/AddToCartForm.tsx",
      "components/CheckoutForm.tsx",
    ]);
  });

  it("writes no upper-case text (but for the wallet transaction id, which is typed in capitals)", () => {
    assert.deepEqual(filesWith(/\buppercase\b/), ["components/WalletPaymentPanel.tsx"]);
  });

  it("marks every decorative svg as hidden from screen readers", () => {
    const missing = files.flatMap((file) =>
      [...file.text.matchAll(/<svg\b[^>]*>/gs)].filter((match) => !match[0].includes("aria-hidden")).map(() => file.name),
    );
    assert.deepEqual(missing, []);
  });
});
