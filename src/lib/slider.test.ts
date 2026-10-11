import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autoplaySeconds, indexFromScroll, isInternalLink, MAX_SLIDES, stepIndex, toSlideViews } from "./slider.ts";
import type { Banner } from "./types.ts";

function slide(overrides: Partial<Banner> = {}): Banner {
  return { id: 1, image_url: "https://api.test/storage/a.webp", headline: null, subtext: null, link: null, sort_order: 0, ...overrides };
}

describe("autoplay speed", () => {
  it("is never faster than six seconds", () => {
    assert.equal(autoplaySeconds({ interval_seconds: 2 }), 6);
    assert.equal(autoplaySeconds({ interval_seconds: 0 }), 6);
    assert.equal(autoplaySeconds({ interval_seconds: 6 }), 6);
  });

  it("keeps a slower pace and falls back to seven seconds when the API sends nothing", () => {
    assert.equal(autoplaySeconds({ interval_seconds: 10 }), 10);
    assert.equal(autoplaySeconds(null), 7);
    assert.equal(autoplaySeconds({ interval_seconds: Number.NaN }), 7);
  });
});

describe("slides", () => {
  it("shows five at most", () => {
    const many = Array.from({ length: 8 }, (_, i) => slide({ id: i + 1 }));
    assert.equal(toSlideViews(many).length, MAX_SLIDES);
  });

  it("skips a slide with no picture", () => {
    assert.deepEqual(toSlideViews([slide({ image_url: "" })]), []);
    assert.deepEqual(toSlideViews(null), []);
  });

  it("builds a srcset from the copies the shop made", () => {
    const [view] = toSlideViews([
      slide({
        desktop: { url: "https://x/1920.webp", width: 1920, height: 800, url_1280: "https://x/1280.webp", url_640: "https://x/640.webp" },
      }),
    ]);

    assert.equal(view.desktop.srcSet, "https://x/640.webp 640w, https://x/1280.webp 1280w, https://x/1920.webp 1920w");
    assert.deepEqual([view.desktop.width, view.desktop.height], [1920, 800]);
  });

  it("serves a picture with no copies from src alone", () => {
    const [view] = toSlideViews([slide()]);

    assert.equal(view.desktop.srcSet, null);
    assert.equal(view.desktop.src, "https://api.test/storage/a.webp");
    assert.deepEqual([view.desktop.width, view.desktop.height], [1920, 800]);
  });

  it("passes the mobile picture through only when there is one", () => {
    const [without] = toSlideViews([slide()]);
    const [withMobile] = toSlideViews([slide({ mobile: { url: "https://x/m.webp", width: 750, height: 500, auto_generated: true } })]);

    assert.equal(without.mobile, null);
    assert.deepEqual(withMobile.mobile, { src: "https://x/m.webp", width: 750, height: 500 });
  });

  it("only shows a button on a slide that links somewhere", () => {
    const [noLink] = toSlideViews([slide({ button_text: "Shop tea sets" })]);
    const [linked] = toSlideViews([slide({ link: "/shop", button_text: " Shop tea sets " })]);

    assert.equal(noLink.buttonText, null);
    assert.equal(linked.buttonText, "Shop tea sets");
    assert.equal(linked.linkIsInternal, true);
  });
});

describe("links", () => {
  it("treats a shop path as internal and anything else as an address", () => {
    assert.equal(isInternalLink("/category/gifts"), true);
    assert.equal(isInternalLink("https://example.com/x"), false);
    assert.equal(isInternalLink("//example.com/x"), false);
  });
});

describe("moving through slides", () => {
  it("reads the slide from the scroll position", () => {
    assert.equal(indexFromScroll(0, 390, 3), 0);
    assert.equal(indexFromScroll(380, 390, 3), 1);
    assert.equal(indexFromScroll(1000, 390, 3), 2);
    assert.equal(indexFromScroll(50, 0, 3), 0);
  });

  it("wraps at both ends", () => {
    assert.equal(stepIndex(2, 1, 3), 0);
    assert.equal(stepIndex(0, -1, 3), 2);
    assert.equal(stepIndex(1, 1, 3), 2);
  });
});
