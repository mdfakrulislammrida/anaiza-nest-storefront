// What the product page shows from the product's own text. Pure functions with no browser APIs, so the static build and
// the client refresh give the same result, and the node tests can run them.
//
// Nothing here makes text up: every word comes from a field the admin filled in.

import { plainText } from "./richHtml.ts";

interface Spec {
  label: string;
  value: string;
}

// The small line under the title: capacity (else size), material, and "Gift box" when one is included. A part that the
// product does not have is left out; a product with none of them has no line.
export function specLine(product: { specifications?: Spec[] | null; gift_box_included?: boolean | null }): string | null {
  const specs = (product.specifications ?? []).filter((spec) => spec.label?.trim() && spec.value?.trim());
  const find = (pattern: RegExp, skip?: RegExp) =>
    specs.find((spec) => pattern.test(spec.label) && !(skip && skip.test(spec.label)))?.value.trim();

  const size = find(/capacity|volume/i) ?? find(/size|dimension/i, /box/i);
  // "Ceramic, colour glaze" is "Ceramic" here: the first thing it is made of.
  const material = find(/^material$/i)?.split(",")[0].trim();
  const box = product.gift_box_included ? "Gift box" : undefined;

  const parts = [size, material, box].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

// The words only: no tags, no case, no punctuation, so "lotus." and "lotus," are the same word.
const norm = (html: string) => plainText(html).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// The same words, or one inside the other.
function overlaps(a: string, b: string): boolean {
  const [x, y] = [norm(a), norm(b)];
  return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));
}

export interface ProductWriting {
  // The short text at the top of the page: the short description, else the summary.
  intro: string | null;
  // The summary, when the short description took the top and the summary says something more.
  lead: string | null;
  // The long description as HTML, or null when there is none or it only repeats the text above.
  longHtml: string | null;
}

// A product can carry a short description, a summary and a long description, and a careless edit puts the same words
// in two of them. The short one goes at the top and the long one under "Description"; a text that only repeats another is
// left out rather than shown twice.
export function productWriting(product: {
  short_description?: string | null;
  summary?: string | null;
  description?: string | null;
}): ProductWriting {
  const short = product.short_description?.trim() || null;
  const summary = product.summary?.trim() || null;
  const description = product.description?.trim() || null;

  const intro = short ?? summary;
  let lead = short && summary && !overlaps(short, summary) ? summary : null;

  const longText = description ? norm(description) : "";
  if (lead && longText.includes(norm(lead))) lead = null;

  const repeats = description !== null && [intro, lead].some((text) => text !== null && norm(text) === longText);

  return { intro, lead, longHtml: description === null || repeats ? null : description };
}

// The description a search result shows: the SEO field, else the short description, else the summary, else the first
// words of the long description (cut at a word, 155 characters at most).
export function metaDescription(product: {
  seo?: { meta_description?: string | null } | null;
  short_description?: string | null;
  summary?: string | null;
  description?: string | null;
}): string | undefined {
  const written = [product.seo?.meta_description, product.short_description, product.summary]
    .map((text) => text?.trim())
    .find((text) => text);
  if (written) return written;

  const text = product.description ? plainText(product.description) : "";
  if (text === "") return undefined;
  if (text.length <= 155) return text;

  const cut = text.slice(0, 155);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 100)).replace(/[\s,;:.-]+$/, "")}…`;
}
