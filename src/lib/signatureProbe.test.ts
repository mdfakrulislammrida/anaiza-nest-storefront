import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

// scripts/signature-probe.cjs is the committed probe: pasted into a browser console it measures a rendered page, and
// here its rules are run on snapshots. The snapshots are the cases the audit found (the product bar and the
// WhatsApp bubble, three burgundy fills on a landing page, ...) next to the pages that pass.
const require = createRequire(import.meta.url);
const probe = require("../../scripts/signature-probe.cjs") as {
  check: (snapshot: Snapshot) => string[];
  PRODUCT_SHADOW: string;
};

interface Snapshot {
  path: string;
  width: number;
  height: number;
  overflowX: boolean;
  h1: number;
  pour: { label: string; hidden: boolean }[];
  frames: { inset: number; short: number; hidden: boolean }[];
  seals: number;
  burgundyFills: string[];
  burgundyItalic: string[];
  shadows: { label: string; value: string }[];
  gradients: { label: string; allowed: boolean }[];
  fixed: { label: string; x: number; y: number; w: number; h: number; modal: boolean; bottom: boolean }[];
}

function page(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    path: "/",
    width: 390,
    height: 844,
    overflowX: false,
    h1: 1,
    pour: [],
    frames: [],
    seals: 0,
    burgundyFills: [],
    burgundyItalic: [],
    shadows: [],
    gradients: [],
    fixed: [],
    ...overrides,
  };
}

const bubble = { label: "a.fixed WhatsApp", x: 322, y: 614, w: 48, h: 48, modal: false, bottom: false };
const bar = (y: number, h: number) => ({ label: "div.fixed order bar", x: 0, y, w: 390, h, modal: false, bottom: true });
const banner = (y: number, h: number) => ({ label: "section.fixed cookie banner", x: 0, y, w: 390, h, modal: false, bottom: true });

describe("a page that follows the kit", () => {
  it("passes: one pour line and frame, a product shadow, a scrim, burgundy once", () => {
    const home = page({
      pour: [{ label: "div.pour-line", hidden: true }],
      frames: [{ inset: 15.6, short: 390, hidden: true }],
      shadows: [{ label: "div.aspect-square", value: probe.PRODUCT_SHADOW }],
      gradients: [{ label: "div scrim", allowed: true }],
      fixed: [bubble, banner(698, 146)],
    });
    assert.deepEqual(probe.check(home), []);
  });

  it("passes a product page with the bubble clear above the bar", () => {
    const product = page({
      seals: 1,
      burgundyFills: ["button.bg-burgundy"],
      fixed: [{ ...bubble, y: 590 }, bar(677, 167)],
    });
    assert.deepEqual(probe.check(product), []);
  });

  it("lets a dialog cover the page and everything on it", () => {
    const drawer = page({
      fixed: [{ label: "div.fixed.inset-0 dialog", x: 0, y: 0, w: 390, h: 844, modal: true, bottom: false }, bar(677, 167), bubble],
    });
    assert.deepEqual(probe.check(drawer), []);
  });
});

describe("what it catches", () => {
  const has = (snapshot: Snapshot, text: string) => probe.check(snapshot).some((problem) => problem.includes(text));

  it("the bubble sitting on the product bar", () => {
    const product = page({ fixed: [{ ...bubble, y: 636 }, bar(677, 167)] });
    assert.ok(has(product, "overlap by 48x7"));
  });

  it("a second pour line, and one a screen reader would read", () => {
    assert.ok(has(page({ pour: [{ label: "a", hidden: true }, { label: "b", hidden: true }] }), "More than one pour line"));
    assert.ok(has(page({ pour: [{ label: "a", hidden: false }] }), "not hidden from screen readers"));
  });

  it("a second seal", () => {
    assert.ok(has(page({ seals: 2 }), "More than one seal"));
  });

  it("burgundy more than once, fills and italic together", () => {
    const landing = page({ burgundyFills: ["hero cta", "product button", "order bar"] });
    assert.ok(has(landing, "Burgundy is used 3 times"));
    assert.ok(has(page({ burgundyFills: ["bar"], burgundyItalic: ["em"] }), "Burgundy is used 2 times"));
  });

  it("a shadow that is not on a product photograph", () => {
    const bad = page({ shadows: [{ label: "section cookie banner", value: "rgba(42, 38, 34, 0.12) 0px -4px 16px 0px" }] });
    assert.ok(has(bad, "A shadow outside product photography"));
  });

  it("a gradient that is not marked as a text scrim", () => {
    assert.ok(has(page({ gradients: [{ label: "div", allowed: false }] }), "not a text scrim"));
  });

  it("a frame that is not 4% of the short side", () => {
    assert.ok(has(page({ frames: [{ inset: 10, short: 700, hidden: true }] }), "4% of its short side"));
  });

  it("sideways scroll, and a page with no or two h1", () => {
    assert.ok(has(page({ overflowX: true }), "scrolls sideways"));
    assert.ok(has(page({ h1: 0 }), "exactly one h1"));
    assert.ok(has(page({ h1: 2 }), "exactly one h1"));
  });

  it("the bar and the cookie banner taking too much of a phone", () => {
    // 167 + 170: the product page on first visit before the banner was made compact.
    const tall = page({ fixed: [bar(677, 167), banner(507, 170)] });
    assert.ok(has(tall, "Fixed bars take 337 px"));
    // The same stack after: bar 167 + banner 146 = 313 px, under the limit.
    assert.ok(!has(page({ fixed: [bar(677, 167), banner(531, 146)] }), "Fixed bars take"));
  });
});
