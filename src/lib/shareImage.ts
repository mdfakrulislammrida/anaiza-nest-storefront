// The picture a shared link shows (Open Graph and Twitter), as one rule for every page.
//
// In order: the API's own picture for the page (`seo.image`, which the API itself fills from the page's share image, then its main picture), the
// older keys that hold the same thing, the picture the page shows, and last the default share image: the one uploaded in the admin (Site settings >
// Brand > Default share image) when there is one, otherwise the committed brand picture at /brand/share-default.png. Always a full https address
// (a machine's own address, localhost, may stay http so `next dev` works).
//
// Kept free of Next so it can be tested with `npm test`.

/** The committed brand picture, 1200 by 630, used while the admin has no default share image of its own. */
export const DEFAULT_SHARE_IMAGE_PATH = "/brand/share-default.png";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.test|.+\.localhost)$/i;

/** A full https address for a stored value, or null when it is no picture address. A relative path is completed with the site's own address. */
export function httpsAddress(value: string | null | undefined, siteUrl: string): string | null {
  const text = typeof value === "string" ? value.trim() : "";

  if (text === "") return null;

  let address: string;

  if (text.startsWith("//")) address = `https:${text}`;
  else if (text.startsWith("/")) address = `${siteUrl.replace(/\/+$/, "")}${text}`;
  else address = text;

  let url: URL;

  try {
    url = new URL(address);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  if (url.protocol === "http:" && !LOCAL_HOST.test(url.hostname)) url.protocol = "https:";

  return url.toString();
}

/** The default share image: the admin's upload, else the committed brand picture. */
export function defaultShareImage(uploaded: string | null | undefined, siteUrl: string): string {
  return httpsAddress(uploaded, siteUrl) ?? httpsAddress(DEFAULT_SHARE_IMAGE_PATH, siteUrl)!;
}

/** The first usable picture of a page, else the default. */
export function pickShareImage(candidates: (string | null | undefined)[], fallback: string, siteUrl: string): string {
  for (const candidate of candidates) {
    const address = httpsAddress(candidate, siteUrl);

    if (address !== null) return address;
  }

  return fallback;
}

export interface ShareInput {
  title: string;
  description?: string | null;
  /** The page's own path, for og:url. Left out for the site-wide default, which every page without its own inherits. */
  url?: string;
  type?: "website" | "article";
  publishedTime?: string | null;
  /** A full https address (see pickShareImage). */
  image: string;
}

/** The openGraph and twitter parts of a page's metadata. A page that sets its own openGraph loses the site's, so each page repeats the image through this. */
export function shareMetadata(input: ShareInput) {
  const description = input.description ?? undefined;
  const isDefault = input.image.endsWith(DEFAULT_SHARE_IMAGE_PATH);

  return {
    openGraph: {
      title: input.title,
      description,
      type: input.type ?? "website",
      ...(input.url ? { url: input.url } : {}),
      ...(input.type === "article" && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      images: [{ url: input.image, ...(isDefault ? SHARE_IMAGE_SIZE : {}) }],
    },
    twitter: { card: "summary_large_image" as const, title: input.title, description, images: [input.image] },
  };
}
