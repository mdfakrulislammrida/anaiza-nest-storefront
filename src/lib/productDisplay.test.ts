import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { metaDescription, productWriting, specLine } from "./productDisplay.ts";

// The live tea jar's own specifications.
const jar = [
  { label: "Material", value: "Ceramic, colour glaze" },
  { label: "Capacity", value: "720 ml" },
  { label: "Jar size", value: "About 11.8 cm wide × 10.6 cm high" },
  { label: "Gift box size", value: "17 × 17 × 14.5 cm" },
];

describe("the small line under the title", () => {
  it("is capacity, the first material and the gift box, from the product's own fields", () => {
    assert.equal(specLine({ specifications: jar, gift_box_included: true }), "720 ml · Ceramic · Gift box");
  });

  it("uses the size when there is no capacity, and never the gift box's size", () => {
    const specs = [{ label: "Gift box size", value: "17 × 17 cm" }, { label: "Jar size", value: "11 cm wide" }];
    assert.equal(specLine({ specifications: specs }), "11 cm wide");
    assert.equal(specLine({ specifications: [{ label: "Gift box size", value: "17 × 17 cm" }] }), null);
  });

  it("leaves out what the product does not have, and is null when nothing is left", () => {
    assert.equal(specLine({ specifications: [{ label: "Material", value: "Porcelain" }], gift_box_included: false }), "Porcelain");
    assert.equal(specLine({ specifications: null, gift_box_included: true }), "Gift box");
    assert.equal(specLine({ specifications: [], gift_box_included: false }), null);
    assert.equal(specLine({}), null);
  });

  it("ignores empty rows", () => {
    assert.equal(specLine({ specifications: [{ label: "Material", value: "  " }, { label: "", value: "x" }] }), null);
  });
});

describe("the intro, the lead and the long description", () => {
  it("puts the short description at the top and keeps a different summary and the long text under Description", () => {
    const writing = productWriting({
      short_description: "A white ceramic tea jar.",
      summary: "The jar keeps loose tea dry and close at hand.",
      description: "<p>A tea jar is a gift for the whole household.</p>",
    });

    assert.equal(writing.intro, "A white ceramic tea jar.");
    assert.equal(writing.lead, "The jar keeps loose tea dry and close at hand.");
    assert.equal(writing.longHtml, "<p>A tea jar is a gift for the whole household.</p>");
  });

  it("uses the summary at the top when there is no short description", () => {
    const writing = productWriting({ short_description: null, summary: "Keeps tea dry.", description: "<p>More.</p>" });

    assert.deepEqual([writing.intro, writing.lead], ["Keeps tea dry.", null]);
  });

  it("does not show the same words twice: a summary that repeats the short text, or a long text that only repeats the intro", () => {
    const same = productWriting({
      short_description: "A white ceramic tea jar with a pink lotus.",
      summary: "A white ceramic tea jar with a pink lotus, and a wooden lid.",
      description: "<p>A white ceramic tea jar with a pink lotus.</p>",
    });
    assert.equal(same.lead, null);
    assert.equal(same.longHtml, null);

    const html = productWriting({ short_description: "Keeps tea dry.", description: "<p><strong>Keeps</strong>   tea dry.</p>" });
    assert.equal(html.longHtml, null);
  });

  it("drops a lead the long description already contains", () => {
    const writing = productWriting({
      short_description: "Short.",
      summary: "Keeps tea dry.",
      description: "<h2>Why</h2><p>It keeps tea dry. And more.</p>",
    });

    assert.equal(writing.lead, null);
    assert.ok(writing.longHtml);
  });

  it("handles a product with no text at all", () => {
    assert.deepEqual(productWriting({}), { intro: null, lead: null, longHtml: null });
  });
});

describe("the description a search result shows", () => {
  it("is the SEO field first, then the short description, then the summary", () => {
    assert.equal(metaDescription({ seo: { meta_description: "From SEO." }, short_description: "Short." }), "From SEO.");
    assert.equal(metaDescription({ seo: { meta_description: " " }, short_description: "Short.", summary: "Sum." }), "Short.");
    assert.equal(metaDescription({ summary: "Sum." }), "Sum.");
  });

  it("falls back to the first words of the long description, cut at a word and under 156 characters", () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const text = metaDescription({ description: `<p>${words}</p><p>More.</p>` });

    assert.ok(text && text.endsWith("…") && text.length <= 156);
    assert.ok(!text.slice(0, -1).endsWith("wor"), "cut at a space");
    assert.equal(metaDescription({ description: "<p>Short text.</p>" }), "Short text.");
  });

  it("is undefined when the product has no words at all", () => {
    assert.equal(metaDescription({}), undefined);
  });
});
