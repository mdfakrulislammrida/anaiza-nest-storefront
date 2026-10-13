// Long written content from the admin (a category's description, a CMS page, a blog article).
//
// Two pure string steps with no browser APIs, so the static build and the client refresh give the same result:
//   1. sanitizeContentHtml(): keeps an allow-list of tags and attributes and nothing else. The API cleans the same
//      way on save and on output; this is the second line, so old data or an older API can never put a script, a
//      style, a class or an id on the page.
//   2. decorateProse(): adds the few classes the design needs ("this paragraph is only an <em>", "this item starts
//      with a bold label", a column label on every table cell). They are added here, after cleaning, so the CMS can
//      never supply a class of its own. Done as a render-time step rather than with :has() because :has() is missing
//      from older Android WebViews and Safari before 15.4, and a render-time class is in the static HTML (no flash).

import { plainText } from "./richHtml.ts";

const ALLOWED = new Set([
  "p", "h2", "h3", "h4", "strong", "em", "del", "br", "a", "ul", "ol", "li", "blockquote", "pre", "hr",
  "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td",
]);

// Said another way. Every <h1> becomes an <h2>: the page's title is its one h1.
const RENAMED: Record<string, string> = { h1: "h2", b: "strong", i: "em", h5: "h4", h6: "h4", strike: "del", s: "del" };

// Dropped together with everything inside them.
const DROPPED_WITH_CONTENT = new Set([
  "script", "style", "iframe", "frameset", "object", "applet", "form", "button", "select", "textarea",
  "noscript", "template", "canvas", "svg", "math", "audio", "video", "head", "title",
]);

// Elements whose content is raw text: they end at the first closing tag, whatever is inside.
const RAW_TEXT = new Set(["script", "style", "iframe", "textarea", "noscript", "title", "template"]);

// Dropped as a single tag (they have no content).
const DROPPED_VOID = new Set(["input", "link", "meta", "base", "embed", "frame", "param", "source", "track"]);

const VOID = new Set(["br", "hr", "img"]);

const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", colon: ":", tab: "\t", newline: "\n",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]{1,6});?/gi, (_m, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});?/g, (_m, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);
}

function safeCodePoint(code: number): string {
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A lone "<" that did not form a tag is text; never let it be read as the start of one.
function escapeText(text: string): string {
  return text.replace(/</g, "&lt;");
}

function safeAddress(value: string, kind: "link" | "picture"): string | null {
  const decoded = decodeEntities(value).replace(/[\u0000- \u007f]+/g, "");
  if (decoded === "" || /&[a-z][a-z0-9]*;/i.test(decoded)) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(decoded)?.[1]?.toLowerCase();
  if (scheme === undefined) return decoded;
  if (scheme === "http" || scheme === "https") return decoded;
  return kind === "link" && (scheme === "mailto" || scheme === "tel") ? decoded : null;
}

function cleanAttributes(tag: string, raw: string): string {
  const seen = new Set<string>();
  let out = "";

  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);

    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    let kept: string | null = null;

    if (tag === "a" && name === "href") kept = safeAddress(value, "link");
    else if (tag === "img" && name === "src") kept = safeAddress(value, "picture");
    else if (tag === "img" && name === "alt") kept = decodeEntities(value);
    else if (tag === "img" && (name === "width" || name === "height")) kept = /^\d{1,4}$/.test(value) ? value : null;
    else if ((tag === "th" || tag === "td") && (name === "colspan" || name === "rowspan")) kept = /^[1-6]$/.test(value) ? value : null;

    if (kept !== null) out += ` ${name}="${escapeAttribute(kept)}"`;
  }

  return out;
}

export function sanitizeContentHtml(html: string): string {
  let out = "";
  let last = 0;
  let skipping: string | null = null;
  let depth = 0;

  for (const match of html.matchAll(TAG)) {
    const whole = match[0];
    const start = match.index ?? 0;
    const isClose = match[1] === "/";
    const name = (match[2] ?? "").toLowerCase();

    if (skipping !== null) {
      if (name === skipping && !whole.startsWith("<!--")) {
        if (isClose) depth -= 1;
        else if (!RAW_TEXT.has(skipping)) depth += 1;
        if (depth <= 0) skipping = null;
      }
      last = start + whole.length;
      continue;
    }

    out += escapeText(html.slice(last, start));
    last = start + whole.length;

    if (whole.startsWith("<!--") || name === "") continue;

    if (DROPPED_WITH_CONTENT.has(name)) {
      if (!isClose) {
        skipping = name;
        depth = 1;
      }
      continue;
    }

    if (DROPPED_VOID.has(name)) continue;

    const tag = RENAMED[name] ?? name;
    if (!ALLOWED.has(tag)) continue; // the tag goes, its text stays

    if (isClose) {
      if (!VOID.has(tag)) out += `</${tag}>`;
    } else {
      out += `<${tag}${cleanAttributes(tag, match[3] ?? "")}>`;
    }
  }

  // An unfinished dropped element (no closing tag) runs to the end, as a browser would read it.
  if (skipping === null) out += escapeText(html.slice(last));

  return out;
}

// Gives every <td> the text of its column's header, so a stacked row on a phone can label each value.
function labelTables(html: string): string {
  return html.replace(/<table>[\s\S]*?<\/table>/gi, (table) => {
    const firstRow = /<tr>([\s\S]*?)<\/tr>/i.exec(table)?.[1] ?? "";
    const headers = [...firstRow.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/gi)].map((m) => plainText(m[1]));
    if (headers.length === 0) return table;

    return table.replace(/<tr>[\s\S]*?<\/tr>/gi, (row) => {
      let column = 0;
      return row.replace(/<(td|th)((?:\s[^>]*)?)>/gi, (cell: string, tag: string, attrs: string) => {
        const span = Number(/\scolspan="(\d)"/i.exec(attrs)?.[1] ?? 1);
        const label = headers[column];
        column += span;
        if (tag.toLowerCase() === "th" || !label) return cell;
        return `<td${attrs} data-label="${escapeAttribute(label)}">`;
      });
    });
  });
}

export function decorateProse(html: string): string {
  // Burgundy is the kit's once-per-layout colour: the first emotional line has it, any later one is navy.
  let seen = false;

  return labelTables(
    html
      // A paragraph that is one <em> and nothing else: the emotional line.
      .replace(/<p>\s*(<em>(?:(?!<\/?em>)[\s\S])*<\/em>)\s*<\/p>/gi, (_match, em: string) => {
        const name = seen ? "an-em-alt" : "an-em";
        seen = true;
        return `<p class="${name}">${em}</p>`;
      })
      // ...and when it closes the text, it is the sign-off instead.
      .replace(/<p class="an-em(?:-alt)?">((?:(?!<\/p>)[\s\S])*)<\/p>(\s*)$/i, '<p class="an-tagline">$1</p>$2')
      // A list item that opens with a bold label.
      .replace(/<li>(\s*)<strong>/gi, '<li class="an-li-label">$1<strong>'),
  );
}

export function proseHtml(html: string): string {
  return decorateProse(sanitizeContentHtml(html));
}
