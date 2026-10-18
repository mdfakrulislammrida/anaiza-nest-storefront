import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  HERO_OVERLAY_CLASS,
  HERO_OVERLAY_OPACITY,
  TILE_OVERLAY_CLASS,
  TILE_OVERLAY_OPACITY,
  heroLoading,
  pictureSet,
  resolveHomepagePictures,
} from "./homepagePictures.ts";
import type { SiteSetting } from "./types.ts";

const set = (width: number) => ({
  src: `https://api.example.test/storage/site/generated/abc-${width}.webp`,
  srcset: `https://api.example.test/storage/site/generated/abc-640.webp 640w, https://api.example.test/storage/site/generated/abc-${width}.webp ${width}w`,
  width,
  height: Math.round(width * 0.625),
});

function settings(images: unknown): SiteSetting {
  return { homepage: { images } } as unknown as SiteSetting;
}

describe("the homepage pictures read from the site settings", () => {
  it("are none when the settings are missing, old, or have no pictures", () => {
    const none = { hero: null, hotDealsTile: null, newArrivalsTile: null };

    assert.deepEqual(resolveHomepagePictures(null), none);
    assert.deepEqual(resolveHomepagePictures({} as SiteSetting), none);
    assert.deepEqual(resolveHomepagePictures({ homepage: {} } as SiteSetting), none);
    assert.deepEqual(
      resolveHomepagePictures(
        settings({ hero: { desktop: null, mobile: null, alt: "" }, hot_deals_tile: { image: null, alt: "" }, new_arrivals_tile: { image: null, alt: "" } }),
      ),
      none,
    );
  });

  it("carry the sizes, the srcset and the alt text of each picture", () => {
    const pictures = resolveHomepagePictures(
      settings({
        hero: { desktop: set(1600), mobile: set(900), alt: "Ivory tea set for two on a linen cloth" },
        hot_deals_tile: { image: set(1200), alt: "" },
        new_arrivals_tile: { image: set(1200), alt: "A boxed gift" },
      }),
    );

    assert.equal(pictures.hero?.desktop.width, 1600);
    assert.equal(pictures.hero?.mobile?.width, 900);
    assert.equal(pictures.hero?.alt, "Ivory tea set for two on a linen cloth");
    assert.equal(pictures.hotDealsTile?.alt, "", "an empty alt stays empty: the picture is decoration");
    assert.equal(pictures.newArrivalsTile?.alt, "A boxed gift");
  });

  it("never turn an empty alt into the headline", () => {
    const written = { homepage: { hero_title: "Tea sets, packed by hand", images: { hero: { desktop: set(1600), mobile: null, alt: "" } } } } as unknown as SiteSetting;

    assert.equal(resolveHomepagePictures(written).hero?.alt, "");
  });

  it("use the desktop picture alone when there is no mobile one, and ignore a mobile one with no desktop one", () => {
    assert.equal(resolveHomepagePictures(settings({ hero: { desktop: set(1600), mobile: null, alt: "" } })).hero?.mobile, null);
    assert.equal(resolveHomepagePictures(settings({ hero: { desktop: null, mobile: set(900), alt: "x" } })).hero, null);
  });

  it("ignore a picture that is not quite one", () => {
    const good = set(1600);

    for (const bad of [
      null,
      "https://x.test/a.webp",
      { ...good, src: "/storage/site/a.webp" },
      { ...good, src: "javascript:alert(1)" },
      { ...good, srcset: "" },
      { ...good, width: "1600" },
      { ...good, height: 0 },
      { ...good, width: 12.5 },
      { src: good.src },
    ]) {
      assert.equal(pictureSet(bad), null, JSON.stringify(bad));
      assert.equal(resolveHomepagePictures(settings({ hero: { desktop: bad, mobile: null, alt: "" } })).hero, null);
    }
  });

  it("keep the alt text to 160 characters and to text", () => {
    assert.equal(resolveHomepagePictures(settings({ hero: { desktop: set(1600), mobile: null, alt: "a".repeat(200) } })).hero?.alt.length, 160);
    assert.equal(resolveHomepagePictures(settings({ hero: { desktop: set(1600), mobile: null, alt: { x: 1 } } })).hero?.alt, "");
  });
});

describe("how the hero picture loads", () => {
  it("is eager and asks for first place when there is no slider", () => {
    assert.deepEqual(heroLoading(false), { loading: "eager", fetchPriority: "high" });
  });

  it("is eager but does not compete with a live slider's first picture", () => {
    assert.deepEqual(heroLoading(true), { loading: "eager", fetchPriority: "auto" });
  });
});

// ---- The flat overlay: ivory, champagne and ivory/80 text must reach 4.5:1 over pure white, the brightest photograph.

type Rgb = [number, number, number];
const ivory: Rgb = [246, 241, 231];
const champagne: Rgb = [212, 183, 134];
const deepink: Rgb = [20, 31, 48];
const white: Rgb = [255, 255, 255];

const mix = (top: Rgb, bottom: Rgb, alpha: number): Rgb => top.map((c, i) => alpha * c + (1 - alpha) * bottom[i]) as Rgb;
const lin = (c: number) => ((c / 255) <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("the overlay behind the text", () => {
  it("keeps every piece of hero text at 4.5:1 or better over the brightest photograph", () => {
    const panel = mix(deepink, white, HERO_OVERLAY_OPACITY);

    assert.ok(ratio(ivory, panel) >= 4.5, "headline");
    assert.ok(ratio(mix(ivory, panel, 0.8), panel) >= 4.5, "paragraph (ivory at 80%)");
    assert.ok(ratio(champagne, panel) >= 4.5, "italic line");
    assert.ok(ratio(champagne, mix(ivory, panel, 0.1)) >= 4.5, "badge on its ivory pill");
  });

  it("keeps the tile text at 4.5:1 or better over the brightest photograph", () => {
    const panel = mix(deepink, white, TILE_OVERLAY_OPACITY);

    assert.ok(ratio(ivory, panel) >= 4.5, "tile heading");
    assert.ok(ratio(mix(ivory, panel, 0.8), panel) >= 4.5, "tile line (ivory at 80%)");
  });

  it("is the class the components use, and is a flat fill", () => {
    assert.equal(HERO_OVERLAY_CLASS, `bg-deepink/${Math.round(HERO_OVERLAY_OPACITY * 100)}`);
    assert.equal(TILE_OVERLAY_CLASS, `bg-deepink/[${TILE_OVERLAY_OPACITY}]`);

    const hero = readFileSync(new URL("../components/Hero.tsx", import.meta.url), "utf8");
    assert.ok(hero.includes("HERO_OVERLAY_CLASS") && hero.includes("TILE_OVERLAY_CLASS"));
    // The one exception is the 120 px fade at the panel's edge: deepink at the panel's own opacity to nothing, marked data-scrim.
    const gradients = hero.split("\n").filter((line) => /gradient/i.test(line));
    assert.equal(gradients.length, 1, "no gradient on the hero or its tiles except the one marked fade");
    assert.ok(gradients[0].includes("data-scrim"), "the fade is marked as a scrim");
    assert.ok(gradients[0].includes(`from-deepink/${Math.round(HERO_OVERLAY_OPACITY * 100)} to-deepink/0`), "it starts at the panel's opacity");
    assert.ok(gradients[0].includes("w-[7.5rem]"), "120 px wide");
  });
});

describe("the hero and tile markup", () => {
  const hero = readFileSync(new URL("../components/Hero.tsx", import.meta.url), "utf8");

  it("gives the phone its own picture source and keeps the desktop file for the rest", () => {
    assert.ok(hero.includes('<source media="(max-width: 639px)" srcSet={mobile.srcset}'));
  });

  it("sets explicit width and height on every picture, and fits them from the centre with CSS", () => {
    const images = hero.match(/<img[\s\S]*?\/>/g) ?? [];

    assert.equal(images.length, 2, "one hero picture and one tile picture component");
    for (const image of images) {
      assert.ok(/width=\{/.test(image) && /height=\{/.test(image), "explicit size");
      assert.ok(image.includes("object-cover"));
    }
  });

  it("makes only the hero picture eager, and the tiles lazy", () => {
    const [heroImage, tileImage] = hero.match(/<img[\s\S]*?\/>/g) ?? ["", ""];

    assert.ok(heroImage.includes("loading={loading}") && heroImage.includes("fetchPriority={fetchPriority}"));
    assert.ok(tileImage.includes('loading="lazy"') && !tileImage.includes("fetchPriority"));
    assert.equal((hero.match(/loading="eager"/g) ?? []).length, 0, "eagerness comes from heroLoading, in one place");
  });

  it("draws the gift frame and the pour line once each in either mode, the pictured ones inside the text panel only", () => {
    assert.equal((hero.match(/<PourLine/g) ?? []).length, 2, "one in each branch, never both at once");
    assert.equal((hero.match(/<GiftFrame/g) ?? []).length, 2);

    const picture = hero.slice(hero.indexOf("function HeroWithPicture"), hero.indexOf("// A side tile."));
    // With a picture they are children of the text panel (never siblings of the photograph), and the fade is the panel's last child.
    const panelStart = picture.indexOf("data-hero-panel");
    const fade = picture.indexOf("data-scrim");
    for (const part of ["<GiftFrame", "<PourLine"]) {
      assert.ok(picture.indexOf(part) > panelStart && picture.indexOf(part) < fade, `${part} is inside the text panel`);
    }
    assert.ok(picture.indexOf("<picture>") < panelStart, "the photograph comes first, the panel over it");
  });
});
