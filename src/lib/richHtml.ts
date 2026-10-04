// Helpers for admin-authored HTML (product/category/article/CMS bodies).
// Pure string transforms with no browser APIs, so they give the same result
// during the static build and in the client.

// Tailwind classes for tables inside authored HTML. Used together with
// wrapTables(): the wrapper scrolls sideways on a narrow screen while the
// table keeps a readable minimum width, so the page itself never overflows.
export const RICH_TABLE_CLASSES =
  "[&_.table-scroll]:my-4 [&_.table-scroll]:overflow-x-auto [&_.table-scroll]:rounded-lg [&_.table-scroll]:border [&_.table-scroll]:border-line " +
  "[&_table]:w-full [&_table]:min-w-[28rem] [&_table]:border-collapse [&_table]:text-left " +
  "[&_th]:bg-pill [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-ink " +
  "[&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2";

// Wraps every <table> in a scroll container.
export function wrapTables(html: string): string {
  return html
    .replace(/<table(\s[^>]*)?>/gi, (match) => `<div class="table-scroll">${match}`)
    .replace(/<\/table\s*>/gi, "</table></div>");
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function plainText(htmlFragment: string): string {
  return htmlFragment
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

// Unicode-aware so Bangla headings get usable anchors too.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TocItem {
  id: string;
  text: string;
}

// Gives every <h2> an id (keeping one that is already there) and returns the
// list for a table of contents. The ids are in the returned HTML itself, so
// the jump links work without any JavaScript.
export function addHeadingAnchors(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();

  const withIds = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2\s*>/gi, (_match, attrs: string | undefined, inner: string) => {
    const attributes = attrs ?? "";
    const text = plainText(inner);
    const existing = attributes.match(/\sid=["']([^"']+)["']/i)?.[1];

    let id = existing ?? (slugify(text) || `section-${toc.length + 1}`);
    if (!existing) {
      const base = id;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);

    if (text) toc.push({ id, text });

    return existing
      ? `<h2${attributes}>${inner}</h2>`
      : `<h2${attributes} id="${id}">${inner}</h2>`;
  });

  return { html: withIds, toc };
}
