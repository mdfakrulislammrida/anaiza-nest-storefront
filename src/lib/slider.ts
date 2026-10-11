import type { Banner, BannerSliderSettings } from "./types";

// The slider's rules that do not need a browser, so they can be tested on their own.

/** The slowest an autoplaying slider may go is the floor: never quicker than this, whatever the API says. */
export const MIN_AUTOPLAY_SECONDS = 6;

export const MAX_SLIDES = 5;

/** What the slider needs of the API's answer, with every gap filled. */
export interface SlideView {
  id: number;
  headline: string | null;
  subtext: string | null;
  link: string | null;
  linkIsInternal: boolean;
  buttonText: string | null;
  desktop: { src: string; srcSet: string | null; width: number; height: number };
  mobile: { src: string; width: number | null; height: number | null } | null;
}

const DESKTOP_FALLBACK = { width: 1920, height: 800 };

/** A path on this shop ("/shop") is navigated with the router; anything else is an ordinary address. */
export function isInternalLink(link: string): boolean {
  return link.startsWith("/") && !link.startsWith("//");
}

export function autoplaySeconds(settings: Pick<BannerSliderSettings, "interval_seconds"> | null | undefined): number {
  const seconds = Number(settings?.interval_seconds);
  return Math.max(MIN_AUTOPLAY_SECONDS, Number.isFinite(seconds) ? seconds : 7);
}

/** The slides the page may show: up to five, each with a picture, in the order the API gave them. */
export function toSlideViews(slides: Banner[] | null | undefined): SlideView[] {
  const views: SlideView[] = [];

  for (const slide of slides ?? []) {
    if (views.length >= MAX_SLIDES) break;

    const url = slide.desktop?.url ?? slide.image_url;
    if (!url) continue;

    const width = slide.desktop?.width ?? null;
    const height = slide.desktop?.height ?? null;

    // Copies the shop made of this picture, smallest first. Each is described by its real width.
    const candidates: string[] = [];
    if (slide.desktop?.url_640) candidates.push(`${slide.desktop.url_640} 640w`);
    if (slide.desktop?.url_1280) candidates.push(`${slide.desktop.url_1280} 1280w`);
    if (width && slide.desktop?.url) candidates.push(`${slide.desktop.url} ${width}w`);

    const link = slide.link?.trim() || null;
    const mobileUrl = slide.mobile?.url ?? null;

    views.push({
      id: slide.id,
      headline: slide.headline?.trim() || null,
      subtext: slide.subtext?.trim() || null,
      link,
      linkIsInternal: link !== null && isInternalLink(link),
      buttonText: link ? slide.button_text?.trim() || null : null,
      desktop: {
        src: url,
        // A single candidate is not a choice, so it is left out and src serves.
        srcSet: candidates.length > 1 ? candidates.join(", ") : null,
        width: width ?? DESKTOP_FALLBACK.width,
        height: height ?? DESKTOP_FALLBACK.height,
      },
      mobile: mobileUrl ? { src: mobileUrl, width: slide.mobile?.width ?? null, height: slide.mobile?.height ?? null } : null,
    });
  }

  return views;
}

/** Which slide a scroll position is on. */
export function indexFromScroll(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count <= 0) return 0;

  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)));
}

/** The slide after or before this one, wrapping round. */
export function stepIndex(current: number, direction: 1 | -1, count: number): number {
  if (count <= 0) return 0;

  return (current + direction + count) % count;
}
