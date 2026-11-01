import { getSiteSettings } from "./api";
import { SITE_URL } from "./config";
import { defaultShareImage } from "./shareImage";

// The default share image for the metadata of every page, read from the site settings once per build (every page asks, and the answer is the same).
let remembered: { at: number; value: Promise<string> } | null = null;

export function siteDefaultShareImage(): Promise<string> {
  const now = Date.now();

  if (remembered === null || now - remembered.at > 60_000) {
    remembered = {
      at: now,
      value: getSiteSettings()
        .then((settings) => defaultShareImage(settings.default_share_image, SITE_URL))
        // Without the settings, the committed brand picture: a share card is never left without a picture.
        .catch(() => defaultShareImage(null, SITE_URL)),
    };
  }

  return remembered.value;
}
