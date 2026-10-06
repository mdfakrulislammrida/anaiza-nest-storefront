"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";

export const DEFAULT_CORPORATE_INTRO =
  "Ordering gifts for your company? Send us the details below and we will reply with a quotation.";

// The admin's intro from Site Settings, or the plain sentence above when none is set. The settings are
// seeded at build time and refreshed once on load, so an edit appears without a rebuild.
export default function CorporateIntro() {
  const { siteSettings } = useSiteSettings();
  const intro = siteSettings?.corporate_intro?.trim() || DEFAULT_CORPORATE_INTRO;

  return <p className="mt-3 max-w-xl whitespace-pre-line text-body text-charcoal/80">{intro}</p>;
}
