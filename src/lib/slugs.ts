// Where a category, a page or a landing page lives, in one place. The API is the source of truth: every one of them answers with its `slug` and a
// ready `path` (for example /category/eid-gifts), and the addresses it used to have (`previous_slugs`). Asked for by an old address it answers
// with a `redirect` hint as well. Everything here only reads those; nothing is guessed from a name.
//
// Kept free of Next and of React so it can be tested with `npm test`.

export type SlugType = "category" | "page" | "landing_page" | "product";

export const PATH_PREFIX: Record<SlugType, string> = {
  category: "/category/",
  page: "/pages/",
  landing_page: "/lp/",
  product: "/product/",
};

/** The API's own words for the kind of page, in the sitemap's redirect list. */
export interface SlugRedirectEntry {
  type: string;
  from: string;
  to: string;
}

/** A path on this site: one slash first, and never two ("//host" would leave the site). Anything else is null. */
export function safePath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim();

  return text.startsWith("/") && !text.startsWith("//") && !/[\s\\]/.test(text) ? text : null;
}

export function pathFor(type: SlugType, slug: string): string {
  return `${PATH_PREFIX[type]}${encodeURIComponent(slug)}`;
}

/** The address of a page: the API's `path` when it is a clean path of the right kind, else built from the slug. */
export function pathOf(type: SlugType, record: { slug: string; path?: string | null }): string {
  const path = safePath(record.path);

  return path !== null && path.startsWith(PATH_PREFIX[type]) ? path : pathFor(type, record.slug);
}

/**
 * Where a page lives now when it was asked for by another address: the API's redirect hint, or (for a page the API answers by its old
 * slug without a hint) the difference between the slug asked for and the page's own. Null when the address asked for is the current one.
 */
export function movedTo(type: SlugType, askedSlug: string, record: { slug: string; path?: string | null; redirect?: { to?: string | null } | null }): string | null {
  const hinted = safePath(record.redirect?.to);

  if (hinted !== null) return hinted;

  return record.slug !== askedSlug ? pathOf(type, record) : null;
}

/** The slugs a kind of page used to have, from the sitemap's list of old addresses (so their pages can be made at build time). */
export function oldSlugs(type: SlugType, redirects: readonly SlugRedirectEntry[]): string[] {
  const prefix = PATH_PREFIX[type];
  const found = new Set<string>();

  for (const entry of redirects) {
    const from = safePath(entry.from);

    if (from === null || !from.startsWith(prefix)) continue;

    const slug = from.slice(prefix.length);

    if (slug !== "" && !slug.includes("/")) {
      try {
        found.add(decodeURIComponent(slug));
      } catch {
        // An address that is not valid text cannot be a page.
      }
    }
  }

  return [...found];
}

/** What a "Shop by occasion" tile links to: the API's `path`, else its `href`. Always a path on this site or a full address. */
export function tileHref(tile: { href: string; path?: string | null }): string {
  return safePath(tile.path) ?? tile.href;
}
