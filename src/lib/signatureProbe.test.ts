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

interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

interface Hero {
  picture: boolean;
  panel: Box | null;
  h1: Box | null;
  badge: Box | null;
  frame: Box | null;
  pour: Box | null;
  left: number;
  right: number;
  headerLeft: number | null;
  headerRight: number | null;
}

interface Product {
  titleTop: number;
  titleHeight: number;
  titleLine?: number | null;
  bar: { h: number } | null;
}

interface Checkout {
  totalBottom: number | null;
  bar: { h: number } | null;
}

interface Snapshot {
  path: string;
  width: number;
  height: number;
  clientWidth: number;
  scrollWidth: number;
  overflowX: boolean;
  header: { rightmost: number; cart: { left: number; right: number; w: number; h: number } | null; cartOptional?: boolean } | null;
  hero: Hero | null;
  product: Product | null;
  checkout: Checkout | null;
  h1: number;
  pour: { label: string; hidden: boolean }[];
  frames: { inset: number; short: number; hidden: boolean }[];
  seals: number;
  burgundyFills: string[];
  burgundyItalic: string[];
  shadows: { label: string; value: string }[];
  radii?: { label: string; value: string; photo: boolean }[];
  gradients: { label: string; allowed: boolean }[];
  fixed: { label: string; x: number; y: number; w: number; h: number; modal: boolean; bottom: boolean }[];
}

function page(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    path: "/",
    width: 390,
    height: 844,
    clientWidth: 390,
    scrollWidth: 390,
    overflowX: false,
    header: { rightmost: 374, cart: { left: 330, right: 374, w: 44, h: 44 } },
    hero: null,
    product: null,
    checkout: null,
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

  it("a corner rounder than 2px, and a rounded photograph", () => {
    assert.ok(has(page({ radii: [{ label: "button.cart", value: "9999px", photo: false }] }), "A corner rounder than 2px"));
    assert.ok(has(page({ radii: [{ label: "img", value: "2px", photo: true }] }), "A photograph with rounded corners"));
    assert.deepEqual(probe.check(page({ radii: [] })), []);
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

  it("counts the bars in pixels on a short phone: 311 px passes at 360 x 640, the old 337 px does not", () => {
    const short = (barHeight: number, bannerHeight: number) =>
      page({
        width: 360,
        height: 640,
        clientWidth: 360,
        scrollWidth: 360,
        fixed: [
          { label: "div.fixed order bar", x: 0, y: 640 - barHeight, w: 360, h: barHeight, modal: false, bottom: true },
          { label: "section.fixed cookie banner", x: 0, y: 640 - barHeight - bannerHeight, w: 360, h: bannerHeight, modal: false, bottom: true },
        ],
      });

    assert.ok(!has(short(166, 145), "Fixed bars take"));
    assert.ok(has(short(167, 170), "Fixed bars take 337 px of 640 px"));
  });
});

// The phones people really have: 360 (the most common in Bangladesh), 375 and 390, and 320 as the floor. The live header
// once ran 29 to 59 px past the screen on all of them: the logo (197 px) and four icons need 419 px.
describe("the header on the phones people really have", () => {
  const has = (snapshot: Snapshot, text: string) => probe.check(snapshot).some((problem) => problem.includes(text));

  const phone = (width: number, cartRight: number, rightmost = cartRight, scrollWidth = width): Snapshot =>
    page({
      width,
      clientWidth: width,
      scrollWidth,
      overflowX: scrollWidth > width,
      header: { rightmost, cart: { left: cartRight - 44, right: cartRight, w: 44, h: 44 } },
    });

  it("passes when the cart ends one gutter from the edge at 320, 360, 375 and 390", () => {
    for (const width of [320, 360, 375, 390]) {
      assert.deepEqual(probe.check(phone(width, width - 16)), [], `${width} px`);
    }
  });

  it("catches the cart pushed past the edge, and the page that then scrolls sideways", () => {
    for (const [width, past] of [[360, 59], [375, 44], [390, 29]] as const) {
      const broken = phone(width, 419, 419, 419);

      assert.ok(has(broken, `The header reaches ${past} px past the screen edge`), `${width} px: header`);
      assert.ok(has(broken, "The cart button is not fully on screen"), `${width} px: cart`);
      assert.ok(has(broken, "scrolls sideways"), `${width} px: page`);
    }
  });

  it("catches sideways scroll that the browser's own inner width hides", () => {
    // On a phone the layout viewport grows to fit the overflow, so innerWidth equals the page's width and an
    // innerWidth comparison sees nothing; clientWidth stays the screen.
    const hidden = page({ width: 419, clientWidth: 360, scrollWidth: 419, overflowX: true });

    assert.ok(has(hidden, "its content is 419 px wide, the screen 360 px"));
  });

  it("wants a cart that is there and big enough to tap", () => {
    assert.ok(has(page({ header: { rightmost: 374, cart: null } }), "no cart button"));
    assert.ok(has(page({ header: { rightmost: 374, cart: { left: 340, right: 374, w: 34, h: 44 } } }), "34 x 44"));
  });
});

// The homepage hero with a picture. Before: the panel was pinned to a 418 px hero while its words needed 535 px, so the
// badge started 53 px above the panel and the headline 2 px above it (both cut off); the frame and the pour line were
// drawn over the whole hero, photograph included; and the hero stood at the header's container edge, 24 px outside its logo
// and cart. The numbers are what was measured at 1280 and 1440 px.
describe("the homepage hero", () => {
  const has = (snapshot: Snapshot, text: string) => probe.check(snapshot).some((problem) => problem.includes(text));

  const hero = (overrides: Partial<Hero> = {}): Hero => ({
    picture: true,
    panel: { l: 24, r: 616, t: 173, b: 708 },
    h1: { l: 88, r: 552, t: 288, b: 408 },
    badge: { l: 88, r: 218.4, t: 237, b: 264 },
    frame: { l: 45.4, r: 594.6, t: 194.4, b: 686.6 },
    pour: { l: 567, r: 568, t: 173, b: 322 },
    left: 24,
    right: 1241,
    headerLeft: 24,
    headerRight: 1241,
    ...overrides,
  });
  const desktop = (overrides: Partial<Hero> = {}) =>
    page({ width: 1280, height: 800, clientWidth: 1265, scrollWidth: 1265, hero: hero(overrides) });

  it("passes with the words, frame and pour line inside the panel and the edges on the header's", () => {
    assert.deepEqual(probe.check(desktop()), []);
  });

  it("passes the hero without a picture (the frame and pour line are the panel's own there)", () => {
    const plain = desktop({ picture: false, frame: { l: 45.4, r: 813.3, t: 194.4, b: 686.6 }, pour: { l: 769.7, r: 770.7, t: 173, b: 322 }, panel: { l: 24, r: 834.7, t: 173, b: 708 } });
    assert.deepEqual(probe.check(plain), []);
  });

  it("catches the badge and the top of the headline cut off by the panel (before: 53 px and 2 px above it)", () => {
    const cut = desktop({ panel: { l: 0, r: 592, t: 173, b: 591 }, badge: { l: 64, r: 194.4, t: 120, b: 147 }, h1: { l: 64, r: 528, t: 171, b: 291 }, frame: null, pour: null, left: 0, right: 1265, headerLeft: 0, headerRight: 1265 });

    assert.ok(has(cut, "The hero badge is cut off by its panel"));
    assert.ok(has(cut, "The hero headline is cut off by its panel"));
  });

  it("catches words outside the screen", () => {
    assert.ok(has(desktop({ h1: { l: -4, r: 460, t: 288, b: 408 } }), "The hero headline is outside the screen"));
    assert.ok(has(desktop({ badge: { l: 88, r: 1300, t: 237, b: 264 } }), "The hero badge is outside the screen"));
  });

  it("catches the frame and the pour line over the photograph when a picture is set (before: both ran across the whole hero)", () => {
    const over = desktop({ frame: { l: 16.7, r: 825.9, t: 189.7, b: 574.3 }, pour: { l: 777.7, r: 778.7, t: 173, b: 322 } });

    assert.ok(has(over, "the gift frame reaches outside the hero's text panel"));
    assert.ok(has(over, "the pour line reaches outside the hero's text panel"));
  });

  it("catches the hero and tiles off the header's left and right edges (before: 24 px out at 1440 px)", () => {
    const out = page({ width: 1440, height: 900, clientWidth: 1425, scrollWidth: 1425, hero: hero({ left: 72.5, right: 1352.5, headerLeft: 96.5, headerRight: 1328.5, panel: { l: 72.5, r: 664.5, t: 173, b: 708 }, h1: { l: 136.5, r: 600.5, t: 288, b: 408 }, badge: { l: 136.5, r: 266.9, t: 237, b: 264 }, frame: { l: 94, r: 643, t: 194.4, b: 686.6 }, pour: { l: 616, r: 617, t: 173, b: 322 } }) });

    assert.ok(has(out, "The hero starts at 72.5 px, the header content at 96.5 px"));
    assert.ok(has(out, "The hero tiles end at 1352.5 px, the header content at 1328.5 px"));
  });

  it("allows 1 px of rounding on the edges, and leaves a phone's edge-to-edge hero alone", () => {
    assert.deepEqual(probe.check(desktop({ left: 24.8, right: 1240.3 })), []);

    const phone = page({ hero: hero({ panel: { l: 0, r: 390, t: 269, b: 834 }, h1: { l: 32, r: 358, t: 352, b: 440 }, badge: { l: 32, r: 162.4, t: 301, b: 328 }, frame: { l: 15.6, r: 374.4, t: 284.6, b: 818.4 }, pour: { l: 365, r: 366, t: 269, b: 418 }, left: 0, right: 390, headerLeft: 16, headerRight: 374 }) });
    assert.deepEqual(probe.check(phone), []);
  });
});
// The product page on a phone. Before: the title stood at 728 px on a 640 px screen (below the first screen), and the fixed
// bar was 167 px tall (26% of the screen) with the price, a quantity and two buttons. Now the title is whole in the first
// screen and the bar, once it shows, is the price and one button in 64 px.
describe("the product page on a phone", () => {
  const has = (snapshot: Snapshot, text: string) => probe.check(snapshot).some((problem) => problem.includes(text));

  const phone = (overrides: Partial<Snapshot> = {}): Snapshot =>
    page({
      path: "/product/lotus-jar",
      width: 360,
      height: 640,
      clientWidth: 360,
      scrollWidth: 360,
      header: { rightmost: 344, cart: { left: 300, right: 344, w: 44, h: 44 } },
      ...overrides,
    });

  it("passes with the title whole in the first screen (582 to 638 px of 640) and no bar at the top of the page", () => {
    assert.deepEqual(probe.check(phone({ product: { titleTop: 581.8, titleHeight: 56, bar: null } })), []);
  });

  it("catches a title below the first screen (before: 728 px on a 640 px screen)", () => {
    const low = phone({ product: { titleTop: 727.8, titleHeight: 102, bar: null } });

    assert.ok(has(low, "The product title ends at 830 px, below the first screen (640 px high)"));
  });

  it("asks only for the first two lines of a title that runs to three (30 px on a 360 px phone)", () => {
    assert.deepEqual(probe.check(phone({ product: { titleTop: 562, titleHeight: 108, titleLine: 36, bar: null } })), []);
    assert.ok(has(phone({ product: { titleTop: 610, titleHeight: 108, titleLine: 36, bar: null } }), "The product title ends at 682 px"));
  });

  it("holds a taller phone and a wide screen to nothing about the fold", () => {
    assert.deepEqual(probe.check(page({ path: "/product/x", width: 1366, height: 768, clientWidth: 1351, scrollWidth: 1351, product: { titleTop: 255, titleHeight: 92, bar: null } })), []);
    assert.deepEqual(probe.check(phone({ width: 390, height: 844, clientWidth: 390, scrollWidth: 390, product: { titleTop: 619.8, titleHeight: 56, bar: null } })), []);
  });

  it("allows a 64 px bar and catches the old 167 px one", () => {
    assert.ok(!has(phone({ product: { titleTop: 581.8, titleHeight: 56, bar: { h: 64 } } }), "sticky bar"));
    assert.ok(has(phone({ product: { titleTop: 581.8, titleHeight: 56, bar: { h: 167 } } }), "The sticky bar is 167 px tall; the limit is 64 px"));
  });

  it("keeps the bubble above the bar, and the bar above the cookie banner, with no overlap", () => {
    const fixed = [
      { label: "div.fixed sticky bar", x: 0, y: 576, w: 360, h: 64, modal: false, bottom: true },
      { label: "section.fixed cookie banner", x: 0, y: 430, w: 360, h: 146, modal: false, bottom: true },
      { label: "a.fixed WhatsApp", x: 292, y: 370, w: 48, h: 48, modal: false, bottom: false },
    ];

    assert.deepEqual(probe.check(phone({ fixed, product: { titleTop: 581.8, titleHeight: 56, bar: { h: 64 } } })), []);

    // The old default put the bubble where the bar is until the bar had been measured.
    const covered = fixed.map((item) => (item.label.includes("WhatsApp") ? { ...item, y: 560 } : item));
    assert.ok(has(phone({ fixed: covered, product: { titleTop: 581.8, titleHeight: 56, bar: { h: 64 } } }), "Fixed items overlap"));
  });
});
// The checkout on a phone. Before: the total stood at y 1891 on a 640 px screen (three screens down) and there was no bar at
// all. Now the total is in the folded summary at the top, and the bar (the total and "Confirm order") is 64 px.
describe("the checkout on a phone", () => {
  const has = (snapshot: Snapshot, text: string) => probe.check(snapshot).some((problem) => problem.includes(text));

  const phone = (width: number, height: number, checkout: Checkout | null): Snapshot =>
    page({
      path: "/checkout",
      width,
      height,
      clientWidth: width,
      scrollWidth: width,
      header: { rightmost: width - 16, cart: { left: width - 60, right: width - 16, w: 44, h: 44 } },
      checkout,
    });

  it("passes with the total in the first screen and a 64 px bar, at 360, 375, 390 and 1366", () => {
    for (const [width, height] of [[360, 640], [375, 667], [390, 844]] as const) {
      assert.deepEqual(probe.check(phone(width, height, { totalBottom: 252, bar: { h: 64 } })), [], `${width} px`);
    }
    assert.deepEqual(probe.check(page({ path: "/checkout", width: 1366, height: 800, clientWidth: 1351, scrollWidth: 1351, checkout: { totalBottom: 590, bar: null } })), []);
  });

  it("does not ask the checkout's small header for a cart, but still wants it on the screen", () => {
    const small = (rightmost: number) => ({ ...phone(360, 640, { totalBottom: 252, bar: { h: 64 } }), header: { rightmost, cart: null, cartOptional: true } });

    assert.deepEqual(probe.check(small(344)), []);
    assert.ok(has(small(400), "The header reaches 40 px past the screen edge"));
    assert.ok(has({ ...phone(360, 640, null), header: { rightmost: 344, cart: null } }, "no cart button"), "every other page still needs one");
  });

  it("catches a total below the first screen (before: y 1891 at 360 x 640)", () => {
    assert.ok(has(phone(360, 640, { totalBottom: 1915.4, bar: null }), "order total ends at 1915 px, below the first screen (640 px high)"));
  });

  it("catches a bar taller than 64 px", () => {
    assert.ok(has(phone(360, 640, { totalBottom: 252, bar: { h: 96 } }), "The checkout bar is 96 px tall; the limit is 64 px"));
  });

  it("keeps the bubble above the bar and the cookie banner above both, with no overlap", () => {
    const fixed = [
      { label: "div.fixed checkout bar", x: 0, y: 576, w: 360, h: 64, modal: false, bottom: true },
      { label: "section.fixed cookie banner", x: 0, y: 431, w: 360, h: 145, modal: false, bottom: true },
      { label: "a.fixed WhatsApp", x: 292, y: 371, w: 48, h: 48, modal: false, bottom: false },
    ];
    assert.deepEqual(probe.check({ ...phone(360, 640, { totalBottom: 252, bar: { h: 64 } }), fixed }), []);

    const covered = fixed.map((item) => (item.label.includes("WhatsApp") ? { ...item, y: 560 } : item));
    assert.ok(has({ ...phone(360, 640, { totalBottom: 252, bar: { h: 64 } }), fixed: covered }, "Fixed items overlap"));
  });
});