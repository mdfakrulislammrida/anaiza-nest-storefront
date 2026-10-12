// Small pure helpers for landing pages (/lp/<slug>), kept free of React so they can be tested on their own.

export const LANDING_PREFIX = "/lp";

// Where the hero button and the product buttons scroll to.
export const LANDING_ANCHORS = { products: "landing-products", order: "landing-order" } as const;

/** Whether a path is a landing page (or the /lp fallback shell). */
export function isLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  return pathname === LANDING_PREFIX || pathname.startsWith(`${LANDING_PREFIX}/`);
}

/** The slug in /lp/<slug>, or null. Works for the build-time page and for the fallback shell, which reads the real path. */
export function landingSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2 || segments[0] !== "lp") return null;

  try {
    return decodeURIComponent(segments[1]);
  } catch {
    return segments[1];
  }
}

/** The admin's preview token in ?preview=..., only when it has the shape the API issues (<expires>.<64 hex>). */
export function previewTokenFromSearch(search: string): string | null {
  const token = new URLSearchParams(search).get("preview")?.trim() ?? "";

  return /^\d{9,12}\.[a-f0-9]{64}$/.test(token) ? token : null;
}

/** Where a hero button goes: an anchor on this page, an address, or nowhere (no address given). */
export function heroDestination(target: string, url: string | null): { kind: "anchor"; id: string } | { kind: "url"; href: string } | null {
  if (target === "order") return { kind: "anchor", id: LANDING_ANCHORS.order };
  if (target === "url") return url && /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url.trim()) ? { kind: "url", href: url.trim() } : null;

  return { kind: "anchor", id: LANDING_ANCHORS.products };
}

/** Counted once per visitor session. */
export function viewedKey(pageId: number): string {
  return `anaiza-lp-viewed-${pageId}`;
}

/** "10 Oct 2026, 6:30 pm" in Dhaka time, for the offer-ended note. */
export function dhakaTime(iso: string | null): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// The calm words for a page whose time has passed.
export const ENDED_TITLE = "This offer has ended";
export const ENDED_TEXT = "Thank you for stopping by. The gifts are still waiting in the shop.";
